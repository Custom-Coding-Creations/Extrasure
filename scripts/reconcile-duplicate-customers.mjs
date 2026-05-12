#!/usr/bin/env node

/**
 * Reconcile duplicate customer records by email.
 * 
 * Finds all customers grouped by normalized email and merges duplicates
 * to a single primary customer record, updating all related records and
 * deleting duplicate customer rows.
 * 
 * Usage: node scripts/reconcile-duplicate-customers.mjs [--dry-run] [--email pattern]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function reconcileCustomers({ dryRun = false, emailPattern = null } = {}) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Customer Reconciliation Report");
  console.log(`${"=".repeat(60)}\n`);

  if (dryRun) {
    console.log("DRY RUN MODE - No changes will be made\n");
  }

  try {
    // Fetch all customers
    const allCustomers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        
      },
      orderBy: { id: "asc" },
    });

    // Group by normalized email
    const groupedByEmail = new Map();
    for (const customer of allCustomers) {
      const normalized = normalizeEmail(customer.email);
      if (!groupedByEmail.has(normalized)) {
        groupedByEmail.set(normalized, []);
      }
      groupedByEmail.get(normalized).push(customer);
    }

    // Find duplicates matching pattern (if provided)
    const duplicateGroups = Array.from(groupedByEmail.entries())
      .filter(([email, customers]) => {
        if (customers.length < 2) return false;
        if (emailPattern) {
          return email.includes(emailPattern.toLowerCase());
        }
        return true;
      });

    if (duplicateGroups.length === 0) {
      console.log("✓ No duplicate customer records found.\n");
      return { merged: 0, deletedCount: 0 };
    }

    console.log(`Found ${duplicateGroups.length} email group(s) with duplicates:\n`);

    let mergedCount = 0;
    let deletedCount = 0;
    const stats = [];

    for (const [email, customers] of duplicateGroups) {
      console.log(`Email: ${email}`);
      console.log(`  Duplicate records: ${customers.length}`);

      // Determine primary customer (prefer account-linked, else oldest)
      let primaryCustomer = customers[0];
      const linkedAccount = await prisma.customerAccount.findUnique({
        where: { email },
        select: { customerId: true },
      });

      if (linkedAccount) {
        const accountLinked = customers.find((c) => c.id === linkedAccount.customerId);
        if (accountLinked) {
          primaryCustomer = accountLinked;
          console.log(`  Primary: ${primaryCustomer.id} (account-linked)`);
        } else {
          console.log(`  Primary: ${primaryCustomer.id} (oldest)`);
        }
      } else {
        console.log(`  Primary: ${primaryCustomer.id} (oldest)`);
      }

      const duplicates = customers.filter((c) => c.id !== primaryCustomer.id);

      // Show records to be moved
      for (const dup of duplicates) {
        console.log(`  Duplicate: ${dup.id} (created ${dup.createdAt.toISOString().split("T")[0]})`);
      }

      // Count related records
      const [invoiceCount, jobCount, bookingCount, noteCount, paymentCount] = await Promise.all([
        prisma.invoice.count({
          where: { customerId: { in: duplicates.map((d) => d.id) } },
        }),
        prisma.job.count({
          where: { customerId: { in: duplicates.map((d) => d.id) } },
        }),
        prisma.serviceBooking.count({
          where: { customerId: { in: duplicates.map((d) => d.id) } },
        }),
        prisma.customerNote.count({
          where: { customerId: { in: duplicates.map((d) => d.id) } },
        }),
        prisma.payment.count({
          where: { invoiceId: { in: (await prisma.invoice.findMany({
            where: { customerId: { in: duplicates.map((d) => d.id) } },
            select: { id: true },
          })).map((inv) => inv.id) } },
        }),
      ]);

      const totalRecords = invoiceCount + jobCount + bookingCount + noteCount + paymentCount;
      if (totalRecords > 0) {
        console.log(`  Related records to merge: ${totalRecords}`);
        if (invoiceCount) console.log(`    - Invoices: ${invoiceCount}`);
        if (jobCount) console.log(`    - Jobs: ${jobCount}`);
        if (bookingCount) console.log(`    - Bookings: ${bookingCount}`);
        if (noteCount) console.log(`    - Notes: ${noteCount}`);
        if (paymentCount) console.log(`    - Payments: ${paymentCount}`);
      }

      stats.push({
        email,
        primaryId: primaryCustomer.id,
        duplicateIds: duplicates.map((d) => d.id),
        recordCount: totalRecords,
      });

      mergedCount++;
      deletedCount += duplicates.length;
    }

    console.log(`\nSummary:`);
    console.log(`  Groups to merge: ${mergedCount}`);
    console.log(`  Customer records to delete: ${deletedCount}`);

    // Execute merge if not dry run
    if (!dryRun && mergedCount > 0) {
      console.log(`\nExecuting merge operations...`);

      for (const stat of stats) {
        const primaryId = stat.primaryId;
        const duplicateIds = stat.duplicateIds;

        await prisma.$transaction(async (tx) => {
          // Move invoices
          await tx.invoice.updateMany({
            where: { customerId: { in: duplicateIds } },
            data: { customerId: primaryId },
          });

          // Move jobs
          await tx.job.updateMany({
            where: { customerId: { in: duplicateIds } },
            data: { customerId: primaryId },
          });

          // Move bookings
          await tx.serviceBooking.updateMany({
            where: { customerId: { in: duplicateIds } },
            data: { customerId: primaryId },
          });

          // Move notes
          await tx.customerNote.updateMany({
            where: { customerId: { in: duplicateIds } },
            data: { customerId: primaryId },
          });

          // Delete duplicate customers
          for (const dupId of duplicateIds) {
            await tx.customer.delete({
              where: { id: dupId },
            });
          }
        });

        console.log(`  ✓ Merged ${stat.email} (${stat.recordCount} records moved)`);
      }

      console.log(`\n✓ Reconciliation complete!\n`);
    } else if (dryRun) {
      console.log(`\nDry run complete. No changes made.\n`);
    }

    return { merged: mergedCount, deletedCount };
  } catch (error) {
    console.error("\n✗ Error during reconciliation:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const emailIndex = args.indexOf("--email");
const emailPattern = emailIndex >= 0 ? args[emailIndex + 1] : null;

reconcileCustomers({ dryRun, emailPattern }).catch((error) => {
  process.exit(1);
});
