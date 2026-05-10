import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  const directUrl = process.env.DATABASE_URL?.trim();

  if (directUrl) {
    return directUrl;
  }

  const prismaAlias = process.env.DATABASE_PRISMA_DATABASE_URL?.trim();

  if (prismaAlias) {
    process.env.DATABASE_URL = prismaAlias;
    return prismaAlias;
  }

  const postgresAlias = process.env.DATABASE_POSTGRES_URL?.trim();

  if (postgresAlias) {
    process.env.DATABASE_URL = postgresAlias;
    return postgresAlias;
  }

  return undefined;
}

resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
