import cron from "node-cron";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import { notificationService } from "../services/notification.service";
import { financialAgentService } from "../services/financial-agent.service";
import { coachService } from "../services/coach.service";
import { emailService } from "../services/email.service";

class Scheduler {
  public async start() {
    logger.info("🕒 Starting background job scheduler...");

    // Seed default coaching challenges (non-fatal — skip if DB not reachable yet)
    try {
      await coachService.seedDefaultChallenges();
    } catch (err: any) {
      logger.warn("⚠️  Could not seed coaching challenges (DB may not be ready): " + err.message);
    }

    // Process recurring transactions every day at midnight
    cron.schedule("0 0 * * *", async () => {
      logger.info("🔄 Running processRecurringTransactions job...");
      try {
        // Find recurring incomes and create new entries for today
        const recurringIncomes = await prisma.income.findMany({
          where: { isRecurring: true, deletedAt: null },
          distinct: ['userId', 'source'],
        });

        for (const income of recurringIncomes) {
          const today = new Date();
          const existsToday = await prisma.income.findFirst({
            where: {
              userId: income.userId,
              source: income.source,
              isRecurring: true,
              date: {
                gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
              },
            },
          });

          if (!existsToday) {
            await prisma.income.create({
              data: {
                userId: income.userId,
                amount: income.amount,
                source: income.source,
                date: today,
                notes: `[Auto] Recurring from ${income.source}`,
                isRecurring: true,
                currency: income.currency,
              },
            });
          }
        }
        logger.info(`Processed ${recurringIncomes.length} recurring income sources`);
      } catch (error: any) {
        logger.error("Failed to process recurring transactions", { error: error.message });
      }
    });

    // Generate monthly reports on the 1st of every month
    cron.schedule("0 0 1 * *", async () => {
      logger.info("📊 Running generateMonthlyReports job...");
      try {
        const users = await prisma.user.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const startOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const endOfMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
        const monthName = startOfMonth.toLocaleString('en', { month: 'long', year: 'numeric' });

        for (const user of users) {
          const [incomeAgg, expenseAgg] = await Promise.all([
            prisma.income.aggregate({
              where: { userId: user.id, deletedAt: null, date: { gte: startOfMonth, lte: endOfMonth } },
              _sum: { amount: true },
            }),
            prisma.expense.aggregate({
              where: { userId: user.id, deletedAt: null, date: { gte: startOfMonth, lte: endOfMonth } },
              _sum: { amount: true },
            }),
          ]);

          const totalIncome = Number(incomeAgg._sum.amount || 0);
          const totalExpense = Number(expenseAgg._sum.amount || 0);
          const savings = totalIncome - totalExpense;

          await notificationService.create(
            user.id,
            'SYSTEM',
            `Monthly Report — ${monthName}`,
            `Income: ₹${totalIncome.toLocaleString()} | Expenses: ₹${totalExpense.toLocaleString()} | Savings: ₹${savings.toLocaleString()}`,
            { type: 'monthly_report', month: lastMonth.getMonth() + 1, year: lastMonth.getFullYear() }
          );
        }
        logger.info(`Generated monthly reports for ${users.length} users`);
      } catch (error: any) {
        logger.error("Failed to generate monthly reports", { error: error.message });
      }
    });

    // Remind about due bills every morning at 8:00 AM
    cron.schedule("0 8 * * *", async () => {
      logger.info("🔔 Running sendBillReminders job...");
      try {
        const now = new Date();
        const bills = await prisma.bill.findMany({
          where: {
            deletedAt: null,
            isPaid: false,
          },
          include: { user: { select: { id: true } } },
        });

        for (const bill of bills) {
          const dueDate = new Date(bill.dueDate);
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilDue >= 0 && daysUntilDue <= bill.reminderDays) {
            await notificationService.create(
              bill.userId,
              'BILL',
              `Bill Due${daysUntilDue === 0 ? ' Today' : ` in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}`,
              `${bill.name} — ₹${Number(bill.amount).toLocaleString()} is due ${daysUntilDue === 0 ? 'today' : `on ${dueDate.toLocaleDateString('en-IN')}`}`,
              { billId: bill.id }
            );
          }
        }
        logger.info(`Processed bill reminders for ${bills.length} bills`);
      } catch (error: any) {
        logger.error("Failed to send bill reminders", { error: error.message });
      }
    });

    // Run AI Financial Agent analysis every day at 10:00 AM
    cron.schedule("0 10 * * *", async () => {
      logger.info("🤖 Running AI Financial Agent analysis...");
      try {
        await financialAgentService.runForAllUsers();
      } catch (error: any) {
        logger.error("AI Financial Agent failed", { error: error.message });
      }
    });

    // Leave Accrual on the 1st of every month at midnight
    cron.schedule("0 0 1 * *", async () => {
      logger.info("🏢 Running monthly leave accrual job...");
      try {
        const users = await prisma.user.findMany({ select: { id: true } });
        for (const user of users) {
          const balance = await prisma.leaveBalance.findUnique({ where: { userId: user.id } });
          const currentCL = balance ? Number(balance.casualLeaves) : 0;
          const currentSL = balance ? Number(balance.sickLeaves) : 0;
          
          const newCL = Math.min(25, currentCL + 1);
          const newSL = Math.min(25, currentSL + 0.5);

          await prisma.leaveBalance.upsert({
            where: { userId: user.id },
            update: { casualLeaves: newCL, sickLeaves: newSL },
            create: { userId: user.id, casualLeaves: newCL, sickLeaves: newSL }
          });
        }
        logger.info(`Accrued leaves for ${users.length} users (Max cap: 25).`);
      } catch (error: any) {
        logger.error("Failed to run leave accrual", { error: error.message });
      }
    });

    // Event Reminders - checks every minute
    cron.schedule("* * * * *", async () => {
      try {
        const now = new Date();
        // Fetch reminders that have not been sent yet
        const pendingReminders = await prisma.eventReminder.findMany({
          where: { isSent: false },
          include: { event: { include: { user: true } } }
        });

        for (const reminder of pendingReminders) {
          const eventTime = new Date(reminder.event.date);
          const triggerTime = new Date(eventTime.getTime() - reminder.minutesBefore * 60 * 1000);
          
          // If the current time is past the trigger time, send it
          if (now >= triggerTime) {
            await emailService.sendEventReminder(
              reminder.event.user.email,
              reminder.event.title,
              reminder.minutesBefore,
              eventTime
            );

            // Mark as sent
            await prisma.eventReminder.update({
              where: { id: reminder.id },
              data: { isSent: true }
            });
          }
        }
      } catch (error: any) {
        logger.error("Failed to process event reminders", { error: error.message });
      }
    });

    // Schedule BullMQ jobs
    this.scheduleBullMQJobs();
  }

  private async scheduleBullMQJobs() {
    try {
      const { portfolioSyncQueue, liabilitySyncQueue, aiCfoQueue } = await import('../config/queue');
      
      // Schedule Portfolio Sync (Live Prices) to run at 6:00 PM every weekday
      await portfolioSyncQueue.add(
        'syncLivePrices',
        {},
        {
          repeat: {
            pattern: '0 18 * * 1-5',
          },
          jobId: 'sync-live-prices-daily'
        }
      );

      // Schedule Liability Sync (EMIs & Premiums) to run daily at 2:00 AM
      await liabilitySyncQueue.add(
        'processUpcomingLiabilities',
        {},
        {
          repeat: {
            pattern: '0 2 * * *',
          },
          jobId: 'process-liabilities-daily'
        }
      );
      
      // Schedule AI CFO Analysis to run weekly on Monday at 3:00 AM
      await aiCfoQueue.add(
        'generateProactiveRecommendations',
        {},
        {
          repeat: {
            pattern: '0 3 * * 1', // Every Monday at 3 AM
          },
          jobId: 'ai-cfo-weekly-scan'
        }
      );
      
      logger.info('📈 BullMQ jobs scheduled successfully.');
    } catch (error) {
      logger.error('Failed to schedule BullMQ jobs', { error });
    }
  }
}

export const scheduler = new Scheduler();
