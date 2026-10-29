import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import {
  artisansTable,
  customerRequestsTable,
  db,
  messagesTable,
  requestResponsesTable,
} from "@workspace/db";
import { SendConnectionMessageBody } from "@workspace/api-zod";
import { ensureArtisanRow, ensureCustomerRow, requireUser } from "../lib/auth";
import { notifyUser, userIdOfCustomer } from "../lib/notify";

// A "connection" is one artisan's response to one customer request, plus
// everything that happens after it: accept, chat, complete.
const router: IRouter = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => UUID_PATTERN.test(value);

type ConnectionRow = {
  response: typeof requestResponsesTable.$inferSelect;
  request: typeof customerRequestsTable.$inferSelect;
  artisan: typeof artisansTable.$inferSelect;
};

function selectConnections() {
  return db
    .select({
      response: requestResponsesTable,
      request: customerRequestsTable,
      artisan: artisansTable,
    })
    .from(requestResponsesTable)
    .innerJoin(customerRequestsTable, eq(requestResponsesTable.requestId, customerRequestsTable.id))
    .innerJoin(artisansTable, eq(requestResponsesTable.artisanId, artisansTable.id));
}

async function loadConnection(id: string): Promise<ConnectionRow | null> {
  if (!isUuid(id)) return null;
  const [row] = await selectConnections().where(eq(requestResponsesTable.id, id));
  return row ?? null;
}

// Works out whether the signed-in person is the customer or the artisan of
// this connection. Anyone else is rejected, so changing an id in the browser
// never gives access to someone else's conversation.
async function authorize(req: Request, res: Response, connectionId: string) {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return null;
  }
  const row = await loadConnection(connectionId);
  if (!row) {
    res.status(404).json({ error: "Connection not found" });
    return null;
  }
  let side: "customer" | "artisan" | null = null;
  if (user.role === "customer") {
    const customer = await ensureCustomerRow(user.id);
    if (row.request.customerId === customer.id) side = "customer";
  } else {
    const artisan = await ensureArtisanRow(user.id);
    if (row.response.artisanId === artisan.id) side = "artisan";
  }
  if (!side) {
    res.status(403).json({ error: "This conversation belongs to other people" });
    return null;
  }
  return { row, side };
}

router.get("/connections", async (req, res) => {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role === "customer") {
    const customer = await ensureCustomerRow(user.id);
    const rows = await selectConnections()
      .where(eq(customerRequestsTable.customerId, customer.id))
      .orderBy(desc(requestResponsesTable.createdAt));
    res.json(rows.map(toConnection));
    return;
  }
  const artisan = await ensureArtisanRow(user.id);
  const rows = await selectConnections()
    .where(eq(requestResponsesTable.artisanId, artisan.id))
    .orderBy(desc(requestResponsesTable.createdAt));
  res.json(rows.map(toConnection));
});

// The customer picks one artisan: the request moves to "in progress", this
// response is accepted and every other response to the request is declined.
router.post("/connections/:connectionId/accept", async (req, res) => {
  const auth = await authorize(req, res, String(req.params.connectionId));
  if (!auth) return;
  const { row, side } = auth;
  if (side !== "customer") {
    res.status(403).json({ error: "Only the customer who posted the request can accept" });
    return;
  }
  if (row.response.status === "accepted") {
    res.json(toConnection(row));
    return;
  }
  if (row.request.status !== "open") {
    res.status(409).json({ error: "This request already has an artisan" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(requestResponsesTable)
      .set({ status: "accepted" })
      .where(eq(requestResponsesTable.id, row.response.id));
    await tx
      .update(requestResponsesTable)
      .set({ status: "declined" })
      .where(
        and(
          eq(requestResponsesTable.requestId, row.request.id),
          ne(requestResponsesTable.id, row.response.id),
        ),
      );
    await tx
      .update(customerRequestsTable)
      .set({ status: "in_progress" })
      .where(eq(customerRequestsTable.id, row.request.id));
  });
  await notifyUser(row.artisan.userId, {
    type: "accepted",
    title: "Your proposal was accepted",
    body: `For: ${row.request.title}. You can chat with the customer now.`,
    link: "/requests",
  });

  const fresh = await loadConnection(row.response.id);
  res.json(toConnection(fresh!));
});

// The customer marks the finished job as completed.
router.post("/connections/:connectionId/complete", async (req, res) => {
  const auth = await authorize(req, res, String(req.params.connectionId));
  if (!auth) return;
  const { row, side } = auth;
  if (side !== "customer") {
    res.status(403).json({ error: "Only the customer can mark the job completed" });
    return;
  }
  if (row.response.status !== "accepted" || row.request.status !== "in_progress") {
    res.status(409).json({ error: "Only a job in progress can be completed" });
    return;
  }
    await db
    .update(customerRequestsTable)
    .set({ status: "completed" })
    .where(eq(customerRequestsTable.id, row.request.id));

  await notifyUser(row.artisan.userId, {
    type: "completed",
    title: "Job marked as completed",
    body: row.request.title,
    link: "/requests",
  });

  const fresh = await loadConnection(row.response.id);
  res.json(toConnection(fresh!));
});

router.get("/connections/:connectionId/messages", async (req, res) => {
  const auth = await authorize(req, res, String(req.params.connectionId));
  if (!auth) return;
  if (auth.row.response.status !== "accepted") {
    res.status(409).json({ error: "Chat opens once the customer accepts the response" });
    return;
  }
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.responseId, auth.row.response.id))
    .orderBy(asc(messagesTable.createdAt));
  res.json(rows.map(toMessage));
});

router.post("/connections/:connectionId/messages", async (req, res) => {
  const input = SendConnectionMessageBody.parse(req.body);
  const auth = await authorize(req, res, String(req.params.connectionId));
  if (!auth) return;
  if (auth.row.response.status !== "accepted") {
    res.status(409).json({ error: "Chat opens once the customer accepts the response" });
    return;
  }
  const body = input.body.trim();
  if (!body) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }
  const [created] = await db
    .insert(messagesTable)
    .values({
      responseId: auth.row.response.id,
      senderRole: auth.side,
      kind: input.kind === "contact" ? "contact" : "text",
      body,
    })
    .returning();
     const preview = created.kind === "contact" ? "Shared contact details" : body;
   if (auth.side === "customer") {
     await notifyUser(auth.row.artisan.userId, {
       type: "message",
       title: "New message from the customer",
       body: preview,
       link: "/requests",
     });
   } else {
     const customerUserId = await userIdOfCustomer(auth.row.request.customerId);
     if (customerUserId) {
       await notifyUser(customerUserId, {
         type: "message",
         title: `New message from ${auth.row.artisan.name || "your artisan"}`,
         body: preview,
         link: "/requests",
       });
     }
   }  
  res.status(201).json(toMessage(created));
});

function toConnection({ response, request, artisan }: ConnectionRow) {
  return {
    id: response.id,
    requestId: response.requestId,
    status: response.status,
    message: response.message,
    quote: response.quote,
    createdAt: response.createdAt.toISOString(),
    artisan: {
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
    },
    request: {
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.category,
      budget: request.budget,
      deadline: request.deadline,
      location: request.location,
      status: request.status,
      postedAt: request.postedAt.toISOString(),
      proposals: request.proposals,
    },
  };
}

function toMessage(row: typeof messagesTable.$inferSelect) {
  return {
    id: row.id,
    senderRole: row.senderRole,
    kind: row.kind,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;