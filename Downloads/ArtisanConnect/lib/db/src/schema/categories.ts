import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Real reference data (dropdown options like "Pottery", "Woodwork") —
// not fake user accounts. Fine to seed; these aren't people's data.
export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default(""),
});

export const insertCategorySchema = createInsertSchema(categoriesTable);
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;