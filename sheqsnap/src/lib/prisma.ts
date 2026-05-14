import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL ?? `file:./dev.db`;
  // Convert relative file path to absolute URL for libsql
  const dbUrl =
    rawUrl.startsWith("file:./") || rawUrl.startsWith("file:../")
      ? `file:${path.resolve(rawUrl.replace(/^file:/, ""))}`
      : rawUrl;

  const adapter = new PrismaLibSql({ url: dbUrl });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
