import { Router, type IRouter } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Latest notifications for the signed-in person + how many are unread.
router.get("/notifications", async (req, res) => {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(30);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, user.id), isNull(notificationsTable.readAt)));
  res.json({
    unreadCount: count,
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

router.post("/notifications/read-all", async (req, res) => {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.userId, user.id), isNull(notificationsTable.readAt)));
  res.json({ ok: true });
});

router.post("/notifications/:id/read", async (req, res) => {
  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  const id = String(req.params.id);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
  res.json({ ok: true });
});

export default router;