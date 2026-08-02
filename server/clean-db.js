const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'hetmwd1384@gmail.com';
  console.log(`Finding user with email: ${email}`);
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  const userId = user.id;
  console.log(`Found user: ${userId}. Deleting all data...`);

  // Delete all relations
  try {
    // Phase 1: Transactions
    const incomes = await prisma.income.deleteMany({ where: { userId } });
    const expenses = await prisma.expense.deleteMany({ where: { userId } });
    
    // Phase 2: Budgets & Goals
    const budgets = await prisma.budget.deleteMany({ where: { userId } });
    const goals = await prisma.goal.deleteMany({ where: { userId } });
    const bills = await prisma.bill.deleteMany({ where: { userId } });
    const subscriptions = await prisma.subscription.deleteMany({ where: { userId } });
    
    // Phase 3: Portfolio & Market
    const invTxs = await prisma.investmentTransaction.deleteMany({ where: { userId } });
    const investments = await prisma.investment.deleteMany({ where: { userId } });
    const loans = await prisma.loan.deleteMany({ where: { userId } });
    const insurances = await prisma.insurance.deleteMany({ where: { userId } });
    const taxes = await prisma.taxProfile.deleteMany({ where: { userId } });
    const documents = await prisma.document.deleteMany({ where: { userId } });
    const watchlists = await prisma.watchlist.deleteMany({ where: { userId } });
    
    // Categories
    const categories = await prisma.category.deleteMany({ where: { userId } });
    
    console.log('Cleanup completed successfully!');
    console.log(`Deleted:
      - ${incomes.count} Incomes
      - ${expenses.count} Expenses
      - ${budgets.count} Budgets
      - ${goals.count} Goals
      - ${bills.count} Bills
      - ${subscriptions.count} Subscriptions
      - ${investments.count} Investments
      - ${invTxs.count} Investment Transactions
      - ${categories.count} Categories
    `);
    
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
