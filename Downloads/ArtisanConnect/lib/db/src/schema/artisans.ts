import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Fields below match what the existing frontend already renders
// (ArtisanSummary / ArtisanProfile in openapi.yaml) so no UI changes
// are needed, plus materials/specialties for the fuller profile.
export const artisansTable = pgTable("artisans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  craft: text("craft").notNull().default(""),
  region: text("region").notNull().default(""),
  rating: doublePrecision("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  startingPrice: integer("starting_price").notNull().default(0),
  imageUrl: text("image_url").notNull().default(""),
  tags: text("tags").array().notNull().default([]),
  materials: text("materials").array().notNull().default([]),
  specialties: text("specialties").array().notNull().default([]),
  verified: boolean("verified").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  bio: text("bio").notNull().default(""),
  experience: text("experience").notNull().default(""),
  completedProjects: integer("completed_projects").notNull().default(0),
  responseTime: text("response_time").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArtisanSchema = createInsertSchema(artisansTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertArtisan = z.infer<typeof insertArtisanSchema>;
export type Artisan = typeof artisansTable.$inferSelect;