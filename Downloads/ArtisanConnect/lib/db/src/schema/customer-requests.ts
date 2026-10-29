import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const requestStatusEnum = pgEnum("request_status", ["open", "in_progress", "completed"]);

export const customerRequestsTable = pgTable("customer_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  budget: integer("budget").notNull().default(0),
  deadline: text("deadline").notNull(),
  location: text("location").notNull(),
  status: requestStatusEnum("status").notNull().default("open"),
  proposals: integer("proposals").notNull().default(0),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerRequestSchema = createInsertSchema(customerRequestsTable).omit({
  id: true,
  customerId: true,
  status: true,
  proposals: true,
  postedAt: true,
});
export type InsertCustomerRequest = z.infer<typeof insertCustomerRequestSchema>;
export type CustomerRequest = typeof customerRequestsTable.$inferSelect;