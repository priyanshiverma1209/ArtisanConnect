import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  artisansTable,
  catalogItemsTable,
  categoriesTable,
  customerRequestsTable,
  db,
  requestResponsesTable,
} from "@workspace/db";
import {
  CreatePortfolioItemBody,
  CreateRequestBody,
  ConnectToRequestBody,
  ConnectToRequestParams,
  GetArtisanParams,
  ListArtisansQueryParams,
  ListRequestsQueryParams,
  RequestUploadUrlBody,
  UpdateProfileBody,
} from "@workspace/api-zod";
import { ensureArtisanRow, ensureCustomerRow, requireUser } from "../lib/auth";
import { notifyUser, userIdOfCustomer } from "../lib/notify";

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  createdAt: string;
};

const uploadedObjects = new Map<string, { data: Buffer; contentType: string }>();

const router: IRouter = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => UUID_PATTERN.test(value);

// ---------------------------------------------------------------------------
// Categories — real reference data (dropdown options), not user accounts.
// ---------------------------------------------------------------------------

router.get("/categories", async (_req, res) => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      icon: categoriesTable.icon,
      count: sql<number>`count(${catalogItemsTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(catalogItemsTable, eq(catalogItemsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id);
  res.json(rows);
});

// ---------------------------------------------------------------------------
// Artisans — public browse/profile data, backed by real signed-up artisans.
// ---------------------------------------------------------------------------

router.get("/artisans", async (req, res) => {
  const query = ListArtisansQueryParams.parse(req.query);
  // Only show artisans who have actually filled in their profile.
  const all = (await db.select().from(artisansTable)).filter(
    (artisan) => artisan.name.trim() !== "" && artisan.craft.trim() !== "",
  );

  const search = query.search?.toLowerCase();
  let result = all.filter((artisan) => {
    const matchesSearch =
      !search ||
      [artisan.name, artisan.craft, artisan.region, ...artisan.tags]
        .join(" ")
        .toLowerCase()
        .includes(search);
    const matchesCategory =
      !query.category ||
      artisan.craft.toLowerCase().includes(query.category.toLowerCase()) ||
      artisan.tags.some((tag) => tag.toLowerCase().includes(query.category!.toLowerCase()));
    const matchesRegion =
      !query.region || artisan.region.toLowerCase().includes(query.region.toLowerCase());
    return matchesSearch && matchesCategory && matchesRegion;
  });

  if (query.sort === "rating") result = [...result].sort((a, b) => b.rating - a.rating);
  if (query.sort === "newest") {
    result = [...result].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  if (query.sort === "featured" || !query.sort) {
    result = [...result].sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  res.json(
    result.map(toArtisanSummary),
  );
});

router.get("/artisans/:id", async (req, res) => {
  const { id } = GetArtisanParams.parse(req.params);
  if (!isUuid(id)) {
    res.status(404).json({ error: "Artisan not found" });
    return;
  }
  const [artisan] = await db.select().from(artisansTable).where(eq(artisansTable.id, id));
  if (!artisan) {
    res.status(404).json({ error: "Artisan not found" });
    return;
  }
  const items = await db
    .select()
    .from(catalogItemsTable)
    .where(eq(catalogItemsTable.artisanId, id))
    .orderBy(desc(catalogItemsTable.createdAt));

  res.json({
    ...artisan,
    portfolio: items.map(toPortfolioItem),
  });
});

// ---------------------------------------------------------------------------
// Customer requests — a customer only ever sees their own; an artisan (or
// an anonymous visitor) sees the public open board.
// ---------------------------------------------------------------------------

router.get("/requests", async (req, res) => {
  const { status } = ListRequestsQueryParams.parse(req.query);
  const user = await requireUser(req);

  if (user?.role === "customer") {
    const customer = await ensureCustomerRow(user.id);
    const rows = await db
      .select()
      .from(customerRequestsTable)
      .where(
        status
          ? and(eq(customerRequestsTable.customerId, customer.id), eq(customerRequestsTable.status, status))
          : eq(customerRequestsTable.customerId, customer.id),
      )
      .orderBy(desc(customerRequestsTable.postedAt));
    res.json(rows.map(toRequestJson));
    return;
  }

  const rows = await db
    .select()
    .from(customerRequestsTable)
    .where(status ? eq(customerRequestsTable.status, status) : undefined)
    .orderBy(desc(customerRequestsTable.postedAt));
  res.json(rows.map(toRequestJson));
});

router.post("/requests", async (req, res) => {
  const input = CreateRequestBody.parse(req.body);
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role !== "customer") {
    res.status(403).json({ error: "Only customer accounts can post a request" });
    return;
  }
  const customer = await ensureCustomerRow(user.id);
  const [created] = await db
    .insert(customerRequestsTable)
    .values({ ...input, customerId: customer.id })
    .returning();
  res.status(201).json(toRequestJson(created));
});

router.post("/requests/:requestId/connect", async (req, res) => {
  const { requestId } = ConnectToRequestParams.parse(req.params);
  const body = ConnectToRequestBody.parse(req.body);
  if (!isUuid(requestId)) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role !== "artisan") {
    res.status(403).json({ error: "Only artisan accounts can respond to a request" });
    return;
  }

  const [request] = await db
    .select()
    .from(customerRequestsTable)
    .where(eq(customerRequestsTable.id, requestId));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (request.status !== "open") {

    res.status(409).json({ error: "This request is no longer open" });
    return;
  }

  const artisan = await ensureArtisanRow(user.id);

  const [existing] = await db
    .select()
    .from(requestResponsesTable)
    .where(
      and(
        eq(requestResponsesTable.requestId, requestId),
        eq(requestResponsesTable.artisanId, artisan.id),
      ),
    );
  if (existing) {
    res.status(200).json({ id: existing.id, requestId, status: "sent", message: existing.message });
    return;
  }

  const [response] = await db
    .insert(requestResponsesTable)
    .values({
      requestId,
      artisanId: artisan.id,
      status: "sent",
      message: body.message.trim(),
      quote: body.quote ?? 0,
    })
    .returning();
  await db
    .update(customerRequestsTable)
    .set({ proposals: sql`${customerRequestsTable.proposals} + 1` })
    .where(eq(customerRequestsTable.id, requestId));

  const customerUserId = await userIdOfCustomer(request.customerId);
   if (customerUserId) {
     await notifyUser(customerUserId, {
       type: "proposal",
       title: `${artisan.name || "An artisan"} sent a proposal`,
       body: `${request.title}${response.quote > 0 ? ` · quote ₹${response.quote.toLocaleString("en-IN")}` : ""}`,
       link: "/requests",
     });
   }  
  res.status(201).json({ id: response.id, requestId, status: "sent", message: response.message });
});

// A customer sees who responded to one of their own requests; the response
// carries the artisan's public summary so the customer can open their profile.
router.get("/requests/:requestId/responses", async (req, res) => {
  const requestId = String(req.params.requestId);
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (!isUuid(requestId)) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const [request] = await db
    .select()
    .from(customerRequestsTable)
    .where(eq(customerRequestsTable.id, requestId));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const customer = user.role === "customer" ? await ensureCustomerRow(user.id) : null;
  if (!customer || request.customerId !== customer.id) {
    res.status(403).json({ error: "You can only see responses to your own requests" });
    return;
  }

  const rows = await db
    .select({ response: requestResponsesTable, artisan: artisansTable })
    .from(requestResponsesTable)
    .innerJoin(artisansTable, eq(requestResponsesTable.artisanId, artisansTable.id))
    .where(eq(requestResponsesTable.requestId, requestId))
    .orderBy(desc(requestResponsesTable.createdAt));

  res.json(
    rows.map(({ response, artisan }) => ({
      id: response.id,
      requestId: response.requestId,
      message: response.message,
      quote: response.quote,
      createdAt: response.createdAt.toISOString(),
      artisan: toArtisanSummary(artisan),
    })),
  );
});

// An artisan sees only their own responses, with the request each belongs to.
router.get("/responses/mine", async (req, res) => {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role !== "artisan") {
    res.status(403).json({ error: "Only artisan accounts have responses" });
    return;
  }
  const artisan = await ensureArtisanRow(user.id);
  const rows = await db
    .select({ response: requestResponsesTable, request: customerRequestsTable })
    .from(requestResponsesTable)
    .innerJoin(customerRequestsTable, eq(requestResponsesTable.requestId, customerRequestsTable.id))
    .where(eq(requestResponsesTable.artisanId, artisan.id))
    .orderBy(desc(requestResponsesTable.createdAt));

  res.json(
    rows.map(({ response, request }) => ({
      id: response.id,
      requestId: response.requestId,
      message: response.message,
      quote: response.quote,
      createdAt: response.createdAt.toISOString(),
      request: toRequestJson(request),
    })),
  );
});

// ---------------------------------------------------------------------------
// Dashboard — real per-user counts. A brand new account naturally starts
// at zero everywhere; nothing here is pre-filled or fabricated.
// ---------------------------------------------------------------------------

router.get("/dashboard", async (req, res) => {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  if (user.role === "artisan") {
    const artisan = await ensureArtisanRow(user.id);
    const [{ activeCount }] = await db
      .select({ activeCount: sql<number>`count(*)::int` })
      .from(requestResponsesTable)
      .where(eq(requestResponsesTable.artisanId, artisan.id));
    const openBoard = await db
      .select()
      .from(customerRequestsTable)
      .where(eq(customerRequestsTable.status, "open"))
      .orderBy(desc(customerRequestsTable.postedAt))
      .limit(3);

    res.json({
      role: "artisan",
      stats: { active: activeCount, completed: 0, saved: 0, earnings: 0 },
      recentRequests: openBoard.map(toRequestJson),
      recentActivity: [],
    });
    return;
  }

  const customer = await ensureCustomerRow(user.id);
  const own = await db
    .select()
    .from(customerRequestsTable)
    .where(eq(customerRequestsTable.customerId, customer.id))
    .orderBy(desc(customerRequestsTable.postedAt));
  const active = own.filter((r) => r.status !== "completed").length;
  const completed = own.filter((r) => r.status === "completed").length;

  res.json({
    role: "customer",
    stats: { active, completed, saved: 0, earnings: 0 },
    recentRequests: own.slice(0, 3).map(toRequestJson),
    recentActivity: [],
  });
});

// ---------------------------------------------------------------------------
// Artisan profile — scoped to whoever is actually signed in, never a
// client-supplied id.
// ---------------------------------------------------------------------------

router.get("/profile", async (req, res) => {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role !== "artisan") {
    res.status(403).json({ error: "Only artisan accounts have this profile" });
    return;
  }
  const artisan = await ensureArtisanRow(user.id);
  const items = await db
    .select()
    .from(catalogItemsTable)
    .where(eq(catalogItemsTable.artisanId, artisan.id))
    .orderBy(desc(catalogItemsTable.createdAt));

  res.json({ ...artisan, portfolio: items.map(toPortfolioItem) });
});

router.patch("/profile", async (req, res) => {
  const input = UpdateProfileBody.parse(req.body);
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role !== "artisan") {
    res.status(403).json({ error: "Only artisan accounts have this profile" });
    return;
  }
  const artisan = await ensureArtisanRow(user.id);
  const [updated] = await db
    .update(artisansTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(artisansTable.id, artisan.id))
    .returning();

  const items = await db
    .select()
    .from(catalogItemsTable)
    .where(eq(catalogItemsTable.artisanId, artisan.id))
    .orderBy(desc(catalogItemsTable.createdAt));
  res.json({ ...updated, portfolio: items.map(toPortfolioItem) });
});

router.post("/portfolio", async (req, res) => {
  const input = CreatePortfolioItemBody.parse(req.body);
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role !== "artisan") {
    res.status(403).json({ error: "Only artisan accounts can add catalog items" });
    return;
  }
  const artisan = await ensureArtisanRow(user.id);
  const [created] = await db
    .insert(catalogItemsTable)
    .values({ ...input, artisanId: artisan.id })
    .returning();
  res.status(201).json(toPortfolioItem(created));
});

// ---------------------------------------------------------------------------
// File upload mock (unchanged) — a local in-memory object store standing in
// for real cloud storage; not part of the user/role data model.
// ---------------------------------------------------------------------------

router.post("/storage/uploads/request-url", (req, res) => {
  const input = RequestUploadUrlBody.parse(req.body);
  const objectPath = `/objects/uploads/${randomUUID()}-${input.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  res.json({
    uploadUrl: `/api/storage/uploads/upload?path=${encodeURIComponent(objectPath)}`,
    objectPath,
  });
});

router.put("/storage/uploads/upload", (req, res) => {
  const path = typeof req.query.path === "string" ? req.query.path : "";
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  req.on("end", () => {
    if (!path.startsWith("/objects/")) {
      res.status(400).json({ error: "Invalid upload path" });
      return;
    }
    uploadedObjects.set(path, {
      data: Buffer.concat(chunks),
      contentType: req.headers["content-type"] ?? "application/octet-stream",
    });
    res.status(200).json({ ok: true });
  });
});

router.get(/^\/storage\/objects\/(.+)$/, (req, res) => {
  const objectPath = `/objects/${req.params[0]}`;
  const object = uploadedObjects.get(objectPath);
  if (!object) {
    res.status(404).json({ error: "Object not found" });
    return;
  }
  res.setHeader("Content-Type", object.contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(object.data);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPortfolioItem(item: typeof catalogItemsTable.$inferSelect): PortfolioItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    mediaUrl: item.mediaUrl,
    mediaType: item.mediaType,
    createdAt: item.createdAt.toISOString(),
  };
}

function toArtisanSummary(artisan: typeof artisansTable.$inferSelect) {
  return {
    id: artisan.id,
    name: artisan.name,
    craft: artisan.craft,
    region: artisan.region,
    rating: artisan.rating,
    reviewCount: artisan.reviewCount,
    startingPrice: artisan.startingPrice,
    imageUrl: artisan.imageUrl,
    tags: artisan.tags,
    verified: artisan.verified,
    featured: artisan.featured,
  };
}

function toRequestJson(row: typeof customerRequestsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    budget: row.budget,
    deadline: row.deadline,
    location: row.location,
    status: row.status,
    postedAt: row.postedAt.toISOString(),
    proposals: row.proposals,
  };
}

export default router;