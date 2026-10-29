import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  artisansTable,
  customerRequestsTable,
  customersTable,
  db,
  requestResponsesTable,
  reviewsTable,
} from "@workspace/db";
import { ensureCustomerRow, requireUser } from "../lib/auth";
import { notifyUser } from "../lib/notify";

const router: IRouter = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => UUID_PATTERN.test(value);

// A customer rates an artisan once the job is completed. Only the customer who
// posted the request can review, and only once per job, so ratings stay honest.
router.post("/connections/:connectionId/review", async (req, res) => {
  const connectionId = String(req.params.connectionId);
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role !== "customer") {
    res.status(403).json({ error: "Only customers can review an artisan" });
    return;
  }
  const rating = Number(req.body?.rating);
  const comment = typeof req.body?.comment === "string" ? req.body.comment.trim().slice(0, 1000) : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Please choose a rating from 1 to 5 stars" });
    return;
  }
  if (!isUuid(connectionId)) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const [row] = await db
    .select({
      response: requestResponsesTable,
      request: customerRequestsTable,
      artisan: artisansTable,
    })
    .from(requestResponsesTable)
    .innerJoin(customerRequestsTable, eq(requestResponsesTable.requestId, customerRequestsTable.id))
    .innerJoin(artisansTable, eq(requestResponsesTable.artisanId, artisansTable.id))
    .where(eq(requestResponsesTable.id, connectionId));
  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const customer = await ensureCustomerRow(user.id);
  if (row.request.customerId !== customer.id) {
    res.status(403).json({ error: "This job belongs to someone else" });
    return;
  }
  if (row.response.status !== "accepted" || row.request.status !== "completed") {
    res.status(409).json({ error: "You can review an artisan after the job is completed" });
    return;
  }

  const [created] = await db
    .insert(reviewsTable)
    .values({
      responseId: row.response.id,
      artisanId: row.artisan.id,
      customerId: customer.id,
      rating,
      comment,
    })
    .onConflictDoNothing()
    .returning();
  if (!created) {
    res.status(409).json({ error: "You have already reviewed this job" });
    return;
  }

  // Keep the artisan's public rating (shown on cards and storefront) in sync.
  const [stats] = await db
    .select({
      average: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.artisanId, row.artisan.id));
  await db
    .update(artisansTable)
    .set({ rating: Math.round(stats.average * 10) / 10, reviewCount: stats.count })
    .where(eq(artisansTable.id, row.artisan.id));

  await notifyUser(row.artisan.userId, {
    type: "review",
    title: `You received a ${rating}-star review`,
    body: comment || row.request.title,
    link: "/profile",
  });

  res.status(201).json({ id: created.id, rating: created.rating, comment: created.comment });
});

// Public: anyone can read an artisan's reviews.
router.get("/artisans/:id/reviews", async (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) {
    res.status(404).json({ error: "Artisan not found" });
    return;
  }
  const rows = await db
    .select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      customerName: customersTable.name,
    })
    .from(reviewsTable)
    .innerJoin(customersTable, eq(reviewsTable.customerId, customersTable.id))
    .where(eq(reviewsTable.artisanId, id))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(100);

  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let total = 0;
  for (const row of rows) {
    distribution[String(row.rating)] += 1;
    total += row.rating;
  }
  res.json({
    average: rows.length ? Math.round((total / rows.length) * 10) / 10 : 0,
    count: rows.length,
    distribution,
    reviews: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      // Only the first name is shown publicly.
      customerName: row.customerName.trim().split(/\s+/)[0] || "Customer",
    })),
  });
});

// Which of my finished jobs I have already reviewed (so the form is hidden).
router.get("/reviews/mine", async (req, res) => {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (user.role !== "customer") {
    res.json([]);
    return;
  }
  const customer = await ensureCustomerRow(user.id);
  const rows = await db
    .select({ responseId: reviewsTable.responseId })
    .from(reviewsTable)
    .where(eq(reviewsTable.customerId, customer.id));
  res.json(rows.map((row) => row.responseId));
});

export default router;