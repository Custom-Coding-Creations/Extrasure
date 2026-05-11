import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeTechnicianName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function isLinkedAdminTechnicianId(id) {
  return id.startsWith("tech_admin_");
}

function getLinkedAdminUserId(technicianId) {
  return `admin_tech_${technicianId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function pickPrimaryTechnician(group, jobCountByTechnicianId) {
  return [...group].sort((a, b) => {
    const aLinkedPenalty = isLinkedAdminTechnicianId(a.id) ? 1 : 0;
    const bLinkedPenalty = isLinkedAdminTechnicianId(b.id) ? 1 : 0;

    if (aLinkedPenalty !== bLinkedPenalty) {
      return aLinkedPenalty - bLinkedPenalty;
    }

    const aJobCount = jobCountByTechnicianId.get(a.id) ?? 0;
    const bJobCount = jobCountByTechnicianId.get(b.id) ?? 0;

    if (aJobCount !== bJobCount) {
      return bJobCount - aJobCount;
    }

    return a.id.localeCompare(b.id);
  })[0];
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const [dbTechnicians, dbJobs] = await Promise.all([
      tx.technician.findMany({ orderBy: { id: "asc" } }),
      tx.job.findMany({ select: { technicianId: true } }),
    ]);

    const groups = new Map();

    for (const technician of dbTechnicians) {
      const key = normalizeTechnicianName(technician.name);
      const bucket = groups.get(key) ?? [];
      bucket.push(technician);
      groups.set(key, bucket);
    }

    const jobCountByTechnicianId = new Map();

    for (const job of dbJobs) {
      jobCountByTechnicianId.set(job.technicianId, (jobCountByTechnicianId.get(job.technicianId) ?? 0) + 1);
    }

    let groupsResolved = 0;
    let deletedTechnicians = 0;
    let reassignedJobs = 0;

    for (const group of groups.values()) {
      if (group.length <= 1) {
        continue;
      }

      groupsResolved += 1;
      const primary = pickPrimaryTechnician(group, jobCountByTechnicianId);

      for (const duplicate of group) {
        if (duplicate.id === primary.id) {
          continue;
        }

        const reassignment = await tx.job.updateMany({
          where: { technicianId: duplicate.id },
          data: { technicianId: primary.id },
        });

        reassignedJobs += reassignment.count;
        deletedTechnicians += 1;

        await tx.technician.delete({ where: { id: duplicate.id } });
        await tx.adminUser.deleteMany({
          where: {
            id: getLinkedAdminUserId(duplicate.id),
            role: "technician",
          },
        });
      }
    }

    return {
      groupsResolved,
      deletedTechnicians,
      reassignedJobs,
      totalTechniciansBefore: dbTechnicians.length,
      totalTechniciansAfter: dbTechnicians.length - deletedTechnicians,
    };
  }, {
    maxWait: 10000,
    timeout: 60000,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("[dedupe-technicians] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
