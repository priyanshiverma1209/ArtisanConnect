import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { artisansTable } from "./artisans";
import { customerRequestsTable } from "./customer-requests";

export const requestResponsesTable = pgTable("request_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => customerRequestsTable.id, { onDelete: "cascade" }),
  artisanId: uuid("artisan_id")
    .notNull()
    .references(() => artisansTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("sent"),
  message: text("message").notNull().default(""),
  // Optional price quote from the artisan; 0 means "no quote given".
  quote: integer("quote").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequestResponseSchema = createInsertSchema(requestResponsesTable).omit({
  id: true,
  artisanId: true,
  status: true,
  createdAt: true,
});
export type InsertRequestResponse = z.infer<typeof insertRequestResponseSchema>;
export type RequestResponse = typeof requestResponsesTable.$inferSelect;