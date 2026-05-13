import { PrismaClient } from "@prisma/client";
import { del } from "@vercel/blob";

function parsePositiveInt(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function parsePhotoUrls(raw) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => typeof item === "string" && /^https?:\/\//i.test(item));
  } catch {
    return [];
  }
}

const prisma = new PrismaClient();
const photoRetentionDays = parsePositiveInt(process.env.AI_TRIAGE_PHOTO_RETENTION_DAYS, 30);
const recordRetentionDays = parsePositiveInt(process.env.AI_TRIAGE_RECORD_RETENTION_DAYS, 120);

const now = Date.now();
const photoCutoff = new Date(now - photoRetentionDays * 24 * 60 * 60 * 1000);
const recordCutoff = new Date(now - recordRetentionDays * 24 * 60 * 60 * 1000);

async function run() {
  console.log(`[triage-retention] photoRetentionDays=${photoRetentionDays} recordRetentionDays=${recordRetentionDays}`);

  const photoCandidates = await prisma.triageAssessment.findMany({
    where: {
      createdAt: {
        lt: photoCutoff,
      },
      photosJson: {
        not: null,
      },
    },
    select: {
      id: true,
      photosJson: true,
    },
    take: 500,
  });

  const urls = Array.from(new Set(photoCandidates.flatMap((item) => parsePhotoUrls(item.photosJson))));

  if (urls.length && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(urls, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    console.log(`[triage-retention] deleted ${urls.length} blob objects`);
  } else if (urls.length) {
    console.log("[triage-retention] BLOB_READ_WRITE_TOKEN missing, skipping blob deletion");
  }

  if (photoCandidates.length) {
    await prisma.triageAssessment.updateMany({
      where: {
        id: {
          in: photoCandidates.map((item) => item.id),
        },
      },
      data: {
        photosJson: null,
      },
    });
    console.log(`[triage-retention] cleared photo references for ${photoCandidates.length} assessments`);
  }

  const deletedRecords = await prisma.triageAssessment.deleteMany({
    where: {
      createdAt: {
        lt: recordCutoff,
      },
    },
  });

  console.log(`[triage-retention] deleted ${deletedRecords.count} aged triage records`);
}

run()
  .catch((error) => {
    console.error("[triage-retention] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
