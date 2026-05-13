import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getTriagePhotoRetentionDays, getTriageRecordRetentionDays } from "@/lib/triage-runtime";

function parsePhotoUrls(raw: string | null) {
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [] as string[];
    }

    return parsed.filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item));
  } catch {
    return [] as string[];
  }
}

export type TriageRetentionExecutionResult = {
  ok: true;
  dryRun: boolean;
  photoRetentionDays: number;
  recordRetentionDays: number;
  matchedPhotoAssessmentCount: number;
  matchedBlobUrlCount: number;
  deletedBlobCount: number;
  clearedPhotoReferenceCount: number;
  deletedRecordCount: number;
};

export async function executeTriageRetention(args: { dryRun: boolean }): Promise<TriageRetentionExecutionResult> {
  const photoRetentionDays = getTriagePhotoRetentionDays();
  const recordRetentionDays = getTriageRecordRetentionDays();
  const now = Date.now();
  const photoCutoff = new Date(now - photoRetentionDays * 24 * 60 * 60 * 1000);
  const recordCutoff = new Date(now - recordRetentionDays * 24 * 60 * 60 * 1000);

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
    take: 1000,
  });

  const blobUrls = Array.from(new Set(photoCandidates.flatMap((item) => parsePhotoUrls(item.photosJson))));
  let deletedBlobCount = 0;
  let clearedPhotoReferenceCount = 0;
  let deletedRecordCount = 0;

  if (!args.dryRun && blobUrls.length && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(blobUrls, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    deletedBlobCount = blobUrls.length;
  }

  if (!args.dryRun && photoCandidates.length) {
    const updateResult = await prisma.triageAssessment.updateMany({
      where: {
        id: {
          in: photoCandidates.map((item) => item.id),
        },
      },
      data: {
        photosJson: null,
      },
    });
    clearedPhotoReferenceCount = updateResult.count;
  }

  if (!args.dryRun) {
    const deleteResult = await prisma.triageAssessment.deleteMany({
      where: {
        createdAt: {
          lt: recordCutoff,
        },
      },
    });
    deletedRecordCount = deleteResult.count;
  }

  return {
    ok: true,
    dryRun: args.dryRun,
    photoRetentionDays,
    recordRetentionDays,
    matchedPhotoAssessmentCount: photoCandidates.length,
    matchedBlobUrlCount: blobUrls.length,
    deletedBlobCount,
    clearedPhotoReferenceCount,
    deletedRecordCount,
  };
}