import { execSync } from "node:child_process";

function isPostgresUrl(value) {
  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}

function resolveSchemaPath() {
  const databaseUrl = (process.env.DATABASE_URL ?? "").trim();
  const isVercelBuild = process.env.VERCEL === "1";

  if (isVercelBuild || isPostgresUrl(databaseUrl)) {
    return "prisma/schema.postgresql.prisma";
  }

  return "prisma/schema.prisma";
}

function run(command) {
  execSync(command, { stdio: "inherit" });
}

const schemaPath = resolveSchemaPath();
const isVercelBuild = process.env.VERCEL === "1";
const shouldPushSchema =
  process.env.PRISMA_DB_PUSH_ON_BUILD === "true" ||
  (isVercelBuild && process.env.DISABLE_PRISMA_DB_PUSH_ON_BUILD !== "true");

console.log(`[prisma] Using schema: ${schemaPath}`);
run(`npx prisma generate --schema ${schemaPath}`);

if (shouldPushSchema) {
  console.log("[prisma] Applying schema with prisma db push");
  run(`npx prisma db push --skip-generate --schema ${schemaPath}`);
}
