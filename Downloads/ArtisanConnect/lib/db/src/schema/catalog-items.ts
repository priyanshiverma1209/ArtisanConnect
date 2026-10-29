import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { artisansTable } from "./artisans";
import { categoriesTable } from "./categories";

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const catalogItemsTable = pgTable("catalog_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  artisanId: uuid("artisan_id")
    .notNull()
    .references(() => artisansTable.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  mediaUrl: text("media_url").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull().default("image"),
  price: integer("price"),
  priceMax: integer("price_max"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCatalogItemSchema = createInsertSchema(catalogItemsTable).omit({
  id: true,
  artisanId: true,
  createdAt: true,
});
export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type CatalogItem = typeof catalogItemsTable.$inferSelect;