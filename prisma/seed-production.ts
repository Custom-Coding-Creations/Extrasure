import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const validRoles: ReadonlyArray<Role> = ["owner", "dispatch", "technician", "accountant"];

function resolveRole(): Role {
  const input = (process.env.ADMIN_LOGIN_ROLE ?? "owner").toLowerCase();
  if (validRoles.includes(input as Role)) {
    return input as Role;
  }

  return "owner";
}

function resolveName() {
  const value = process.env.ADMIN_LOGIN_NAME?.trim();
  return value && value.length > 0 ? value : "Owner";
}

function resolveId() {
  const email = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
  if (email && email.length > 0) {
    return `owner:${email}`;
  }

  return "owner:primary";
}

async function main() {
  const id = resolveId();
  const role = resolveRole();
  const name = resolveName();

  await prisma.adminUser.upsert({
    where: { id },
    update: {
      name,
      role,
    },
    create: {
      id,
      name,
      role,
      twoFactorEnabled: false,
    },
  });

  const total = await prisma.adminUser.count();
  console.log(`[seed-production] ensured admin user ${id} (${role}); total admin users: ${total}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
