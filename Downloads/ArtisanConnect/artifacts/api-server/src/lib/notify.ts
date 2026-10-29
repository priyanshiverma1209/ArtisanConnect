import { and, eq, isNull } from "drizzle-orm";
import { customersTable, db, notificationsTable } from "@workspace/db";
import { logger } from "./logger";

type NotifyInput = {
  type: "proposal" | "accepted" | "completed" | "message" | "review";
  title: string;
  body?: string;
  link?: string;
};

/**
 * Creates a notification for one user. It never throws: a notification problem
 * must not break the real action (sending a message, accepting a proposal...).
 *
 * Chat messages are merged: while the person has not read the previous
 * "new message" notification for the same chat, it is updated instead of
 * adding a new row for every single message.
 */
export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  try {
    const link = input.link ?? "";
    const body = (input.body ?? "").slice(0, 200);
    if (input.type === "message") {
      const [existing] = await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, userId),
            eq(notificationsTable.type, "message"),
            eq(notificationsTable.link, link),
            isNull(notificationsTable.readAt),
          ),
        );
      if (existing) {
        await db
          .update(notificationsTable)
          .set({ title: input.title, body, createdAt: new Date() })
          .where(eq(notificationsTable.id, existing.id));
        return;
      }
    }
    await db.insert(notificationsTable).values({ userId, type: input.type, title: input.title, body, link });
  } catch (err) {
    logger.error({ err }, "Could not create notification");
  }
}

export async function userIdOfCustomer(customerId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: customersTable.userId })
    .from(customersTable)
    .where(eq(customersTable.id, customerId));
  return row?.userId ?? null;
}