import { Worker, Job } from 'bullmq';
import { redisConnection } from './config/queue';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { MarketService } from './services/market.service';

const marketService = new MarketService();

logger.info('Starting MoneyOS AI Background Worker...');

const worker = new Worker(
  'portfolioSync',
  async (job: Job) => {
    logger.info(`Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'syncLivePrices') {
      const investments = await prisma.investment.findMany({
        where: {
          type: { in: ['STOCK', 'ETF', 'MUTUAL_FUND', 'CRYPTO'] },
          symbol: { not: null },
        },
      });

      logger.info(`Found ${investments.length} investments to sync.`);

      for (const inv of investments) {
        if (!inv.symbol) continue;
        try {
          const currentPrice = await marketService.getLivePrice(inv.symbol);
          if (currentPrice) {
            await prisma.investment.update({
              where: { id: inv.id },
              data: {
                currentPrice,
                lastSyncedAt: new Date(),
              },
            });
            logger.info(`Synced ${inv.symbol} to price ${currentPrice}`);
          }
        } catch (error: any) {
          logger.error(`Failed to sync price for ${inv.symbol}`, { error: error.message, symbol: inv.symbol });
        }
      }
    }
  },
  { connection: redisConnection as any }
);

const liabilityWorker = new Worker(
  'liabilitySync',
  async (job: Job) => {
    logger.info(`Processing liability job ${job.id} of type ${job.name}`);
    if (job.name === 'processUpcomingLiabilities') {
      const { loanService } = await import('./services/loan.service');
      const { insuranceService } = await import('./services/insurance.service');
      const { subscriptionService } = await import('./services/subscription.service');
      
      await loanService.processUpcomingEMIs();
      await insuranceService.processUpcomingPremiums();
      await subscriptionService.processUpcomingPayments();
    }
  },
  { connection: redisConnection as any }
);

const aiCfoWorker = new Worker(
  'aiCfoSync',
  async (job: Job) => {
    logger.info(`Processing AI CFO job ${job.id} of type ${job.name}`);
    if (job.name === 'generateProactiveRecommendations') {
      const { aiCfoQueue } = await import('./config/queue');
      const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true } });
      for (const user of users) {
        await aiCfoQueue.add('generateUserCfoRecommendation', { userId: user.id }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        });
      }
    } else if (job.name === 'generateUserCfoRecommendation') {
      const { aiCfoService } = await import('./services/ai-cfo.service');
      await aiCfoService.generateProactiveRecommendations(job.data.userId);
    } else if (job.name === 'runUserFinancialAgent') {
      const { financialAgentService } = await import('./services/financial-agent.service');
      await financialAgentService.runAgentAnalysis(job.data.userId);
    }
  },
  { connection: redisConnection as any }
);

[worker, liabilityWorker, aiCfoWorker].forEach(w => {
  w.on('completed', (job) => {
    logger.info(`Job ${job.id} has completed!`);
  });

  w.on('failed', (job, err: any) => {
    logger.error(`Job ${job?.id} has failed with ${err.message}`, { err: err.message, job: job?.id });
  });
});

process.on('SIGINT', async () => {
  logger.info('Shutting down workers...');
  await worker.close();
  await liabilityWorker.close();
  await aiCfoWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
