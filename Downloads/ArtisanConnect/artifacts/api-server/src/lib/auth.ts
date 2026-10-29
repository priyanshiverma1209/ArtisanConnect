import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import {
  artisansTable,
  customersTable,
  db,
  usersTable,
  type Artisan,
  type Customer,
  type User,
} from "@workspace/db";

/**
 * Finds the app's `users` row for the signed-in Clerk account, creating it
 * the first time that person is ever seen — this is the "auto-save on
 * first entry" behavior: nothing is pre-seeded, a row only exists once a
 * real person has actually signed in.
 *
 * `roleHint` is only used the first time a row is created (e.g. from the
 * "/join/customer" or "/join/artisan" choice the person made before
 * signing up). Once a user row exists, its role is fixed server-side and
 * no client input can change it.
 */
export async function ensureUser(
  req: Request,
  roleHint?: "customer" | "artisan",
): Promise<User | null> {
  const { userId: clerkUserId } = getAuth(req);
  if (!clerkUserId) return null;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  if (existing) return existing;

  const [created] = await db
    .insert(usersTable)
    .values({ clerkUserId, role: roleHint === "artisan" ? "artisan" : "customer" })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // Lost a create race with a parallel request for the same brand-new user.
  const [raced] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  return raced ?? null;
}

export async function ensureArtisanRow(userId: string): Promise<Artisan> {
  const [existing] = await db.select().from(artisansTable).where(eq(artisansTable.userId, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(artisansTable)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [raced] = await db.select().from(artisansTable).where(eq(artisansTable.userId, userId));
  return raced!;
}

export async function ensureCustomerRow(userId: string): Promise<Customer> {
  const [existing] = await db.select().from(customersTable).where(eq(customersTable.userId, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(customersTable)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [raced] = await db.select().from(customersTable).where(eq(customersTable.userId, userId));
  return raced!;
}

function roleHintFromHeader(req: Request): "customer" | "artisan" | undefined {
  const value = req.header("x-onboarding-role");
  return value === "artisan" || value === "customer" ? value : undefined;
}

export async function requireUser(req: Request) {
  return ensureUser(req, roleHintFromHeader(req));
}