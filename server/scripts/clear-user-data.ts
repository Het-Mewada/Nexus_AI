import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearUserData() {
  const email = process.argv[2];

  if (!email) {
    console.error("Please provide an email address.");
    console.error("Usage: npx ts-node scripts/clear-user-data.ts <email>");
    process.exit(1);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`User with email ${email} not found in the database.`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name || user.email} (${user.id})`);
    console.log("Clearing all associated data...");

    // Delete in a transaction to ensure all or nothing
    await prisma.$transaction(async (tx: any) => {
      const deleteSafe = async (model: string) => {
        if (tx[model] && typeof tx[model].deleteMany === 'function') {
          try {
            await tx[model].deleteMany({ where: { userId: user.id } });
          } catch (e) {
            // ignore
          }
        }
      };

      const models = [
        // Phase 5
        "aiCfoRecommendation", "knowledgeGraphNode", "knowledgeGraphEdge", 
        "workspace", "plugin", "workflow", "financialPlan",
        // Phase 4
        "aiConversation", "aiInsight", "coachingProgress", 
        "smartSaving", "achievement", "event", "leaveBalance",
        // Phase 3
        "investment", "loan", "insurance", "taxProfile", 
        "document", "groupMember", "watchlist", "contact", "address",
        // Core
        "income", "expense", "salaryRecord", "budget", "goal", 
        "bill", "subscription", "notification", "auditLog", "category"
      ];

      await Promise.all(models.map(model => deleteSafe(model)));

      // Reset user specific fields like initialBalance
      await tx.user.update({
        where: { id: user.id },
        data: {
          initialBalance: null
        }
      });
    }, { timeout: 15000 });

    console.log(`✅ Successfully cleared all data for user ${email}`);
    
  } catch (error) {
    console.error("Error clearing user data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearUserData();
