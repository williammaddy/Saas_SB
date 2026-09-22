import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export function getPublicErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);
  if (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("PrismaClientInitializationError")
  ) {
    return "Database is not running. Start PostgreSQL with `docker compose up -d`, then try again.";
  }
  return fallback;
}
