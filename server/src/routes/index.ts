import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { authController } from "../controllers/auth.controller";
import { userController } from "../controllers/user.controller";
import { incomeController } from "../controllers/income.controller";
import { expenseController } from "../controllers/expense.controller";
import { salaryController } from "../controllers/salary.controller";
import { categoryController } from "../controllers/category.controller";
import { analyticsController } from "../controllers/analytics.controller";
import { settingsController } from "../controllers/settings.controller";
import { searchController } from "../controllers/search.controller";
import { exportController } from "../controllers/export.controller";
import { budgetController } from "../controllers/budget.controller";
import { goalController } from "../controllers/goal.controller";
import { billController } from "../controllers/bill.controller";
import { subscriptionController } from "../controllers/subscription.controller";
import { notificationController } from "../controllers/notification.controller";
import investmentRoutes from "./investment.routes";
import liabilityRoutes from "./liability.routes";
import familyRoutes from "./family.routes";
import documentRoutes from "./document.routes";
import taxRoutes from "./tax.routes";
import smartSavingsRoutes from "./smart-savings.routes";
import calendarRoutes from "./calendar.routes";
import contactsRoutes from "./contacts.routes";
import addressesRoutes from "./addresses.routes";
import { validate } from "../middleware/validate";
import { uploadReceipt } from "../middleware/upload";
import { authLimiter } from "../middleware/rateLimiter";
import {
  updateProfileSchema,
  createIncomeSchema,
  updateIncomeSchema,
  incomeQuerySchema,
  expenseQuerySchema,
  createSalarySchema,
  updateSalarySchema,
  createCategorySchema,
  updateCategorySchema,
  updateSettingsSchema,
  searchQuerySchema,
  createBudgetSchema,
  updateBudgetSchema,
  createGoalSchema,
  updateGoalSchema,
  createBillSchema,
  updateBillSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from "../validators/schemas";

const router = Router();

// ─── Auth ────────────────────────────────────────
router.post("/auth/sync", authLimiter, authMiddleware, authController.syncUser);

// ─── User ────────────────────────────────────────
router.get("/users/me", authMiddleware, userController.getProfile);
router.patch("/users/me", authMiddleware, validate(updateProfileSchema), userController.updateProfile);
router.delete("/users/me", authMiddleware, userController.deleteAccount);

// ─── Income ──────────────────────────────────────
router.get("/income", authMiddleware, validate(incomeQuerySchema, "query"), incomeController.list);
router.post("/income", authMiddleware, validate(createIncomeSchema), incomeController.create);
router.get("/income/:id", authMiddleware, incomeController.getById);
router.patch("/income/:id", authMiddleware, validate(updateIncomeSchema), incomeController.update);
router.delete("/income/:id", authMiddleware, incomeController.delete);

// ─── Expenses ────────────────────────────────────
router.get("/expenses", authMiddleware, validate(expenseQuerySchema, "query"), expenseController.list);
router.post("/expenses", authMiddleware, uploadReceipt.single("receipt"), expenseController.create);
router.get("/expenses/:id", authMiddleware, expenseController.getById);
router.patch("/expenses/:id", authMiddleware, uploadReceipt.single("receipt"), expenseController.update);
router.delete("/expenses/:id", authMiddleware, expenseController.delete);

// ─── Salary ──────────────────────────────────────
router.get("/salary", authMiddleware, salaryController.list);
router.post("/salary", authMiddleware, validate(createSalarySchema), salaryController.create);
router.get("/salary/:id", authMiddleware, salaryController.getById);
router.patch("/salary/:id", authMiddleware, validate(updateSalarySchema), salaryController.update);
router.delete("/salary/:id", authMiddleware, salaryController.delete);

// ─── Categories ──────────────────────────────────
router.get("/categories", authMiddleware, categoryController.list);
router.post("/categories", authMiddleware, validate(createCategorySchema), categoryController.create);
router.patch("/categories/:id", authMiddleware, validate(updateCategorySchema), categoryController.update);
router.delete("/categories/:id", authMiddleware, categoryController.delete);

// ─── Analytics ───────────────────────────────────
router.get("/analytics/dashboard", authMiddleware, analyticsController.getDashboard);
router.get("/analytics/charts", authMiddleware, analyticsController.getCharts);
router.get("/analytics/cashflow", authMiddleware, analyticsController.getCashFlow);
router.get("/analytics/categories", authMiddleware, analyticsController.getCategoryBreakdown);

// ─── Settings ────────────────────────────────────
router.get("/settings", authMiddleware, settingsController.get);
router.patch("/settings", authMiddleware, validate(updateSettingsSchema), settingsController.update);

// ─── Search ──────────────────────────────────────
router.get("/search", authMiddleware, validate(searchQuerySchema, "query"), searchController.search);

// ─── Export ──────────────────────────────────────
router.get("/export/csv", authMiddleware, exportController.exportCSV);

// ─── Budgets ─────────────────────────────────────
router.get("/budgets", authMiddleware, budgetController.list);
router.post("/budgets", authMiddleware, validate(createBudgetSchema), budgetController.create);
router.get("/budgets/:id", authMiddleware, budgetController.getById);
router.patch("/budgets/:id", authMiddleware, validate(updateBudgetSchema), budgetController.update);
router.delete("/budgets/:id", authMiddleware, budgetController.delete);

// ─── Goals ───────────────────────────────────────
router.get("/goals", authMiddleware, goalController.list);
router.post("/goals", authMiddleware, validate(createGoalSchema), goalController.create);
router.get("/goals/:id", authMiddleware, goalController.getById);
router.patch("/goals/:id", authMiddleware, validate(updateGoalSchema), goalController.update);
router.delete("/goals/:id", authMiddleware, goalController.delete);

// ─── Bills ───────────────────────────────────────
router.get("/bills", authMiddleware, billController.list);
router.post("/bills", authMiddleware, validate(createBillSchema), billController.create);
router.get("/bills/:id", authMiddleware, billController.getById);
router.patch("/bills/:id", authMiddleware, validate(updateBillSchema), billController.update);
router.patch("/bills/:id/paid", authMiddleware, billController.markPaid);
router.delete("/bills/:id", authMiddleware, billController.delete);

// ─── Subscriptions ───────────────────────────────
router.get("/subscriptions", authMiddleware, subscriptionController.list);
router.post("/subscriptions", authMiddleware, validate(createSubscriptionSchema), subscriptionController.create);
router.get("/subscriptions/:id", authMiddleware, subscriptionController.getById);
router.patch("/subscriptions/:id", authMiddleware, validate(updateSubscriptionSchema), subscriptionController.update);
router.patch("/subscriptions/:id/cancel", authMiddleware, subscriptionController.cancel);
router.delete("/subscriptions/:id", authMiddleware, subscriptionController.delete);

// ─── Notifications ───────────────────────────────
router.get("/notifications", authMiddleware, notificationController.list);
router.patch("/notifications/:id/read", authMiddleware, notificationController.markRead);
router.patch("/notifications/read-all", authMiddleware, notificationController.markAllRead);
router.delete("/notifications/:id", authMiddleware, notificationController.delete);

// ─── Investments & Liabilities ───────────────────
router.use("/investments", investmentRoutes);
router.use("/liabilities", liabilityRoutes);

// ─── Family & Documents ──────────────────────────
import marketRoutes from "./market.routes";
router.use("/family", familyRoutes);
router.use("/contacts", contactsRoutes);
router.use("/documents", documentRoutes);
router.use("/taxes", taxRoutes);
router.use("/calendar", calendarRoutes);
router.use("/market", marketRoutes);

// ─── AI ──────────────────────────────────────────
import { aiController } from "../controllers/ai.controller";
router.get("/ai/insights", authMiddleware, aiController.getInsights);
router.post("/ai/chat", authMiddleware, aiController.chat);
router.post("/ai/categorize", authMiddleware, aiController.categorize);

// ─── Phase 4A: Conversations (AI Memory) ─────────
import { conversationController } from "../controllers/conversation.controller";
router.get("/conversations", authMiddleware, conversationController.listConversations);
router.post("/conversations", authMiddleware, conversationController.createConversation);
router.get("/conversations/:id", authMiddleware, conversationController.getConversation);
router.patch("/conversations/:id", authMiddleware, conversationController.updateConversation);
router.delete("/conversations/:id", authMiddleware, conversationController.deleteConversation);
router.post("/conversations/:id/messages", authMiddleware, conversationController.sendMessage);

// ─── Phase 4A: Financial Agent ───────────────────
router.get("/agent/insights", authMiddleware, conversationController.getAgentInsights);
router.post("/agent/analyze", authMiddleware, conversationController.runAgentAnalysis);
router.patch("/agent/insights/:id/read", authMiddleware, conversationController.markInsightRead);
router.patch("/agent/insights/:id/dismiss", authMiddleware, conversationController.dismissInsight);

// ─── Phase 4A: Wealth Coach ─────────────────────
import { coachController } from "../controllers/coach.controller";
router.get("/coach/daily-tip", authMiddleware, coachController.getDailyTip);
router.get("/coach/weekly-review", authMiddleware, coachController.getWeeklyReview);
router.get("/coach/challenges", authMiddleware, coachController.getChallenges);
router.get("/coach/my-challenges", authMiddleware, coachController.getUserChallenges);
router.post("/coach/challenges/:id/start", authMiddleware, coachController.startChallenge);
router.patch("/coach/challenges/:id/progress", authMiddleware, coachController.updateProgress);

// ─── Phase 4B: Smart Savings ─────────────────────
router.use("/smart-savings", authMiddleware, smartSavingsRoutes);

// ─── Phase 5: AI CFO ─────────────────────────────
import aiCfoRoutes from "./ai-cfo.routes";
router.use("/ai-cfo", aiCfoRoutes);

// ─── Phase 5: Knowledge Graph ────────────────────
import knowledgeGraphRoutes from "./knowledge-graph.routes";
router.use("/knowledge-graph", knowledgeGraphRoutes);

// ─── Phase 5: Spending Behavior ──────────────────
import spendingBehaviorRoutes from "./spending-behavior.routes";
router.use("/spending-behavior", spendingBehaviorRoutes);

// ─── Phase 5: Negotiation Assistant ──────────────
import negotiationRoutes from "./negotiation.routes";
router.use("/negotiation", negotiationRoutes);

// ─── Address Book ────────────────────────────────
router.use("/addresses", addressesRoutes);

export default router;

