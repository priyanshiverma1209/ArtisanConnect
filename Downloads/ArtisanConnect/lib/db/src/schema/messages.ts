import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { requestResponsesTable } from "./request-responses";

// One chat message between a customer and the artisan whose response they
// accepted. `kind` is "text" for normal messages or "contact" when someone
// chooses to share their phone/email.
export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  responseId: uuid("response_id")
    .notNull()
    .references(() => requestResponsesTable.id, { onDelete: "cascade" }),
  senderRole: text("sender_role").notNull(),
  kind: text("kind").notNull().default("text"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;