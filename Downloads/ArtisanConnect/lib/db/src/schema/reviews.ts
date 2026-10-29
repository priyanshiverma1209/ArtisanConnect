import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { artisansTable } from "./artisans";
import { customersTable } from "./customers";
import { requestResponsesTable } from "./request-responses";

// One rating + optional written feedback, left by a customer for the artisan
// they worked with. `responseId` is unique: one review per finished job.
export const reviewsTable = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .unique()
      .references(() => requestResponsesTable.id, { onDelete: "cascade" }),
    artisanId: uuid("artisan_id")
      .notNull()
      .references(() => artisansTable.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_artisan_idx").on(t.artisanId)],
);

export type Review = typeof reviewsTable.$inferSelect;