/**
 * ─────────────────────────────────────────────────────────────────────────────
 * USER DATA CLEAR / RESET CONFIGURATION FILE
 * ─────────────────────────────────────────────────────────────────────────────
 * How to use:
 * 1. Configure targetEmail and select features to reset below.
 * 2. Set `confirmDelete: true` to execute deletion (or `false` for dry run inspection).
 * 3. Run: npm run clear:user-data
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const CONFIG = {
  // Target User Email
  targetEmail: "hetmewada1234@gmail.com",

  // Select features / data domains to clear (set true to clear, false to keep):
  features: {
    expenses: true,         // Clears user expenses (PROTECTS auto-synced entries!)
    incomes: true,          // Clears user incomes (PROTECTS auto-synced entries!)
    budgets: false,         // Clears user budgets
    goals: false,           // Clears user savings goals
    bills: false,           // Clears user bills
    subscriptions: false,   // Clears user subscriptions
    smartSavings: false,    // Clears user smart savings entries
    salaryRecords: false,   // Clears user salary records (PROTECTS synced entries!)
    notifications: false,   // Clears user notifications
    auditLogs: false,       // Clears user audit log history
    investments: false,     // Clears user investments & portfolio transactions
    loans: false,           // Clears user loans & liabilities
    insurances: false,      // Clears user insurance policies
    taxProfiles: false,     // Clears user tax calculations & profiles
    documents: false,       // Clears user uploaded documents
    events: false,          // Clears user calendar events
    customCategories: false,// Clears user custom categories (keeps default app categories)
    initialBalance: false,  // Resets user starting initial account balance
  },


  // Set to true to execute deletion. Set to false for a safe dry-run preview.
  confirmDelete: true,
};



// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
import { dataClearService } from "../services/dataClear.service";
import { prisma } from "../config/database";

async function run() {
  const startTime = Date.now();
  console.log("\n======================================================================");
  console.log(" 🧹 NEXUS AI — PRODUCTION USER DATA CLEAR UTILITY");
  console.log("======================================================================\n");

  try {
    console.log(`🔍 Target User Email : ${CONFIG.targetEmail}`);
    console.log(`⚙️  Execution Mode   : ${CONFIG.confirmDelete ? "LIVE DELETION" : "DRY RUN (INSPECTION ONLY)"}`);
    console.log("----------------------------------------------------------------------");

    const report = await dataClearService.processClearRequest({
      userEmail: CONFIG.targetEmail,
      features: CONFIG.features,
      confirmDelete: CONFIG.confirmDelete,
    });

    console.log(`\n👤 Account Found : ${report.user.name ?? "User"} (${report.user.email})`);
    console.log(`🆔 Account ID    : ${report.user.id}\n`);

    console.log("📋 Summary of Data Domains Processed:");
    console.log("----------------------------------------------------------------------");
    console.log(
      " Domain".padEnd(22) +
      "Requested".padEnd(12) +
      "Deleted Count".padEnd(16) +
      "Protected (Synced)"
    );
    console.log("----------------------------------------------------------------------");

    for (const res of report.results) {
      console.log(
        ` ${res.domain}`.padEnd(22) +
        `${res.requested ? "YES" : "NO"}`.padEnd(12) +
        `${res.deletedCount}`.padEnd(16) +
        `🛡️  ${res.protectedCount} skipped`
      );
    }

    console.log("----------------------------------------------------------------------");
    console.log(`📊 TOTAL RECORDS DELETED   : ${report.totalDeleted}`);
    console.log(`🛡️  TOTAL PROTECTED (SYNCED): ${report.totalProtected}`);
    console.log(`⏱️  Time Elapsed           : ${Date.now() - startTime} ms`);
    console.log("----------------------------------------------------------------------\n");

    if (!CONFIG.confirmDelete) {
      console.log("💡 NOTICE: Dry run complete. No records were deleted.");
      console.log("   To execute live deletion, set `confirmDelete: true` in CONFIG.\n");
    } else {
      console.log("✅ SUCCESS: Data clear operation completed safely.\n");
    }
  } catch (error: any) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-run script when invoked via command line
run();
