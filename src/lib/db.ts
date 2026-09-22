import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // next build on Vercel imports this module. Prisma throws if DATABASE_URL is missing.
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://build:build@127.0.0.1:5432/build?schema=public";
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export function getPublicErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);
  if (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("PrismaClientInitializationError")
  ) {
    return "Cannot reach the database. Check DATABASE_URL and that Postgres is running.";
  }
  return fallback;
}
