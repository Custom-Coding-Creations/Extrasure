import { prisma } from "@/lib/prisma";
import { decryptManualSecret, encryptManualSecret } from "@/lib/admin-manual-crypto";

const manualCategories = [
  "vercel",
  "github",
  "stripe",
  "openai",
  "database",
  "oauth",
  "operations",
] as const;

export type ManualCategory = (typeof manualCategories)[number];

export type AdminManualSecretListItem = {
  id: string;
  title: string;
  platform: string;
  category: ManualCategory;
  portalUrl: string | null;
  username: string | null;
  notes: string | null;
  isActive: boolean;
  lastRotatedAt: Date | null;
  updatedAt: Date;
};

export type UpsertManualSecretInput = {
  title: string;
  platform: string;
  category: string;
  portalUrl?: string;
  username?: string;
  notes?: string;
  secretValue?: string;
  isActive?: boolean;
};

function normalizeCategory(input: string): ManualCategory {
  const value = input.trim().toLowerCase();

  if (!manualCategories.includes(value as ManualCategory)) {
    throw new Error("Invalid manual secret category.");
  }

  return value as ManualCategory;
}

function normalizeOptional(input?: string) {
  const value = (input ?? "").trim();
  return value.length > 0 ? value : null;
}

function toListItem(
  item: Awaited<ReturnType<typeof prisma.adminManualSecret.findFirstOrThrow>>,
): AdminManualSecretListItem {
  return {
    id: item.id,
    title: item.title,
    platform: item.platform,
    category: item.category as ManualCategory,
    portalUrl: item.portalUrl,
    username: item.username,
    notes: item.notes,
    isActive: item.isActive,
    lastRotatedAt: item.lastRotatedAt,
    updatedAt: item.updatedAt,
  };
}

function getValidatedInput(input: UpsertManualSecretInput) {
  const title = input.title.trim();
  const platform = input.platform.trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!platform) {
    throw new Error("Platform is required.");
  }

  return {
    title,
    platform,
    category: normalizeCategory(input.category),
    portalUrl: normalizeOptional(input.portalUrl),
    username: normalizeOptional(input.username),
    notes: normalizeOptional(input.notes),
    isActive: input.isActive ?? true,
  };
}

export function getManualCategories(): ManualCategory[] {
  return [...manualCategories];
}

export async function listManualSecrets() {
  const secrets = await prisma.adminManualSecret.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { platform: "asc" }, { title: "asc" }],
  });

  return secrets.map(toListItem);
}

export async function listManualSecretsByCategory() {
  const secrets = await listManualSecrets();

  return manualCategories.reduce<Record<ManualCategory, AdminManualSecretListItem[]>>(
    (accumulator, category) => {
      accumulator[category] = secrets.filter((item) => item.category === category);
      return accumulator;
    },
    {
      vercel: [],
      github: [],
      stripe: [],
      openai: [],
      database: [],
      oauth: [],
      operations: [],
    },
  );
}

export async function createManualSecret(input: UpsertManualSecretInput) {
  const validated = getValidatedInput(input);
  const secretValue = (input.secretValue ?? "").trim();

  if (!secretValue) {
    throw new Error("Secret value is required.");
  }

  const encrypted = encryptManualSecret(secretValue);

  const created = await prisma.adminManualSecret.create({
    data: {
      title: validated.title,
      platform: validated.platform,
      category: validated.category,
      portalUrl: validated.portalUrl,
      username: validated.username,
      notes: validated.notes,
      encryptedValue: encrypted.encryptedValue,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      isActive: validated.isActive,
      lastRotatedAt: new Date(),
    },
  });

  return toListItem(created);
}

export async function updateManualSecret(id: string, input: UpsertManualSecretInput) {
  const secretId = id.trim();

  if (!secretId) {
    throw new Error("Secret id is required.");
  }

  const existing = await prisma.adminManualSecret.findUnique({ where: { id: secretId } });

  if (!existing) {
    throw new Error("Manual secret not found.");
  }

  const validated = getValidatedInput(input);
  const nextValue = (input.secretValue ?? "").trim();
  const encrypted = nextValue ? encryptManualSecret(nextValue) : null;

  const updated = await prisma.adminManualSecret.update({
    where: { id: secretId },
    data: {
      title: validated.title,
      platform: validated.platform,
      category: validated.category,
      portalUrl: validated.portalUrl,
      username: validated.username,
      notes: validated.notes,
      isActive: validated.isActive,
      encryptedValue: encrypted?.encryptedValue ?? existing.encryptedValue,
      iv: encrypted?.iv ?? existing.iv,
      authTag: encrypted?.authTag ?? existing.authTag,
      lastRotatedAt: encrypted ? new Date() : existing.lastRotatedAt,
    },
  });

  return toListItem(updated);
}

export async function deleteManualSecret(id: string) {
  const secretId = id.trim();

  if (!secretId) {
    throw new Error("Secret id is required.");
  }

  return prisma.adminManualSecret.delete({ where: { id: secretId } });
}

export async function revealManualSecretValue(id: string) {
  const secretId = id.trim();

  if (!secretId) {
    throw new Error("Secret id is required.");
  }

  const secret = await prisma.adminManualSecret.findUnique({ where: { id: secretId } });

  if (!secret || !secret.isActive) {
    throw new Error("Manual secret not found.");
  }

  return {
    id: secret.id,
    title: secret.title,
    value: decryptManualSecret({
      encryptedValue: secret.encryptedValue,
      iv: secret.iv,
      authTag: secret.authTag,
    }),
  };
}
