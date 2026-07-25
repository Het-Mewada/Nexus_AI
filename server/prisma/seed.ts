import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "Food", color: "#f97316", icon: "utensils" },
  { name: "Shopping", color: "#ec4899", icon: "shopping-bag" },
  { name: "Petrol", color: "#8b5cf6", icon: "fuel" },
  { name: "Travel", color: "#06b6d4", icon: "plane" },
  { name: "Rent", color: "#64748b", icon: "home" },
  { name: "Electricity", color: "#eab308", icon: "zap" },
  { name: "Internet", color: "#3b82f6", icon: "wifi" },
  { name: "Medical", color: "#ef4444", icon: "heart-pulse" },
  { name: "Entertainment", color: "#a855f7", icon: "gamepad-2" },
  { name: "Investment", color: "#10b981", icon: "trending-up" },
  { name: "Education", color: "#14b8a6", icon: "graduation-cap" },
  { name: "Family", color: "#f43f5e", icon: "users" },
  { name: "Miscellaneous", color: "#6b7280", icon: "tag" },
];

async function main() {
  console.log("🌱 Seeding default categories...");

  for (const category of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: null,
        name: category.name,
      },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          color: category.color,
          icon: category.icon,
        },
      });
    } else {
      await prisma.category.create({
        data: {
          name: category.name,
          color: category.color,
          icon: category.icon,
          isDefault: true,
          userId: null,
        },
      });
    }
  }

  console.log(`✅ Seeded ${defaultCategories.length} default categories`);

  console.log("🌱 Seeding default coaching challenges...");
  const defaultChallenges = [
    { title: 'No-Spend Weekend', description: 'Avoid all non-essential spending for an entire weekend. Pack meals, use free entertainment, and see how much you save.', category: 'SPENDING', difficulty: 'EASY', durationDays: 2 },
    { title: '30-Day Savings Sprint', description: 'Save at least 20% of your income this month by cutting unnecessary expenses and automating transfers.', category: 'SAVING', difficulty: 'MEDIUM', durationDays: 30 },
    { title: 'Subscription Audit', description: 'Review all active subscriptions. Cancel at least one you haven\'t used in the past 30 days.', category: 'SPENDING', difficulty: 'EASY', durationDays: 7 },
    { title: 'Debt Snowball Kickstart', description: 'Make one extra payment toward your smallest outstanding loan this month.', category: 'DEBT', difficulty: 'MEDIUM', durationDays: 30 },
    { title: 'Emergency Fund Builder', description: 'Set up an emergency fund goal and contribute at least 5% of your income toward it.', category: 'SAVING', difficulty: 'EASY', durationDays: 30 },
    { title: 'Investment Starter', description: 'Research and make your first investment (stock, mutual fund, or SIP) this week.', category: 'INVESTING', difficulty: 'MEDIUM', durationDays: 7 },
    { title: 'Budget Master', description: 'Create budgets for your top 3 spending categories and stay within them for 2 weeks.', category: 'BUDGETING', difficulty: 'HARD', durationDays: 14 },
    { title: 'Expense Tracker Streak', description: 'Log every single expense for 7 consecutive days without missing one.', category: 'BUDGETING', difficulty: 'EASY', durationDays: 7 },
  ];

  for (const challenge of defaultChallenges) {
    const existing = await prisma.coachingChallenge.findFirst({
      where: { title: challenge.title },
    });

    if (existing) {
      await prisma.coachingChallenge.update({
        where: { id: existing.id },
        data: {
          description: challenge.description,
          category: challenge.category,
          difficulty: challenge.difficulty,
          durationDays: challenge.durationDays,
        },
      });
    } else {
      await prisma.coachingChallenge.create({
        data: {
          title: challenge.title,
          description: challenge.description,
          category: challenge.category,
          difficulty: challenge.difficulty,
          durationDays: challenge.durationDays,
        },
      });
    }
  }
  console.log(`✅ Seeded ${defaultChallenges.length} default coaching challenges`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
