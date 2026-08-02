import { z } from "zod";

// ─── Common ──────────────────────────────────────
const paginationQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// ─── Auth ────────────────────────────────────────
export const syncUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// ─── User Profile ────────────────────────────────
export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
  timezone: z.string().min(1).max(50).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  monthlySalary: z.coerce.number().min(0).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  initialBalance: z.coerce.number().optional(),
});

// ─── Income ──────────────────────────────────────
export const createIncomeSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  source: z.string().min(1, "Source is required").max(100),
  date: z.coerce.date(),
  notes: z.string().max(500).optional(),
  isRecurring: z.boolean().optional().default(false),
  currency: z.string().length(3).optional().default("INR"),
});

export const updateIncomeSchema = createIncomeSchema.partial();

export const incomeQuerySchema = paginationQuery.extend({
  source: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  search: z.string().optional(),
});

// ─── Expense ─────────────────────────────────────
export const createExpenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  categoryId: z.string().uuid("Invalid category"),
  merchant: z.string().min(1, "Merchant is required").max(100),
  date: z.coerce.date(),
  paymentMethod: z.enum(["cash", "credit_card", "debit_card", "upi", "net_banking", "wallet", "other"]).optional().default("cash"),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = paginationQuery.extend({
  categoryId: z.string().uuid().optional(),
  merchant: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  paymentMethod: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
});

// ─── Salary ──────────────────────────────────────
export const createSalarySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  baseSalary: z.coerce.number().positive("Base salary must be greater than 0"),
  leaves: z.coerce.number().int().min(0).optional().default(0),
  halfDays: z.coerce.number().int().min(0).optional().default(0),
  bonus: z.coerce.number().min(0).optional().default(0),
  otherDeductions: z.coerce.number().min(0).optional().default(0),
  actualCredited: z.coerce.number().min(0).optional(),
  creditedDate: z.string().optional(),
  discrepancyReason: z.string().optional(),
});

export const updateSalarySchema = createSalarySchema.partial();

// ─── Category ────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional().default("#6366f1"),
  icon: z.string().min(1).max(50).optional().default("tag"),
});

export const updateCategorySchema = createCategorySchema.partial();

// ─── Settings ────────────────────────────────────
export const updateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
});

// ─── Search ──────────────────────────────────────
export const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  type: z.enum(["all", "income", "expense"]).optional().default("all"),
  limit: z.string().optional(),
});

// ─── Analytics ───────────────────────────────────
export const analyticsQuerySchema = z.object({
  year: z.string().optional(),
  month: z.string().optional(),
  period: z.enum(["month", "quarter", "year"]).optional().default("month"),
});

// ─── Budget ──────────────────────────────────────
export const createBudgetSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  type: z.enum(["OVERALL", "CATEGORY"]).optional().default("OVERALL"),
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional().default("MONTHLY"),
  categoryId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  alertThreshold: z.coerce.number().int().min(1).max(100).optional().default(80),
});

export const updateBudgetSchema = createBudgetSchema.partial();

// ─── Goal ────────────────────────────────────────
export const createGoalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  targetAmount: z.coerce.number().positive("Target amount must be greater than 0"),
  currentAmount: z.coerce.number().min(0).optional().default(0),
  deadline: z.coerce.date().optional(),
  monthlyContribution: z.coerce.number().min(0).optional(),
});

export const updateGoalSchema = createGoalSchema.partial();

// ─── Bill ────────────────────────────────────────
export const createBillSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  dueDate: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
  isPaid: z.boolean().optional().default(false),
  autoPay: z.boolean().optional().default(false),
  isRecurring: z.boolean().optional().default(false),
  reminderDays: z.coerce.number().int().min(0).max(30).optional().default(3),
});

export const updateBillSchema = createBillSchema.partial();

// ─── Subscription ────────────────────────────────
export const createSubscriptionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
  nextPayment: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();

// ─── Investment ──────────────────────────────────
export const createInvestmentSchema = z.object({
  type: z.enum(["STOCK", "MUTUAL_FUND", "ETF", "CRYPTO", "FD", "GOLD", "REAL_ESTATE"]),
  symbol: z.string().max(20).optional(),
  name: z.string().min(1, "Name is required").max(100),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  averagePrice: z.coerce.number().min(0),
  investedAmount: z.coerce.number().min(0),
  currentPrice: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional().default("INR"),
  notes: z.string().max(500).optional(),
});

export const updateInvestmentSchema = createInvestmentSchema.partial();

// ─── Loan ────────────────────────────────────────
export const createLoanSchema = z.object({
  type: z.enum(["HOME", "PERSONAL", "EDUCATION", "VEHICLE", "CREDIT_CARD"]),
  name: z.string().min(1, "Name is required").max(100),
  principalAmount: z.coerce.number().positive(),
  outstandingAmount: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100),
  emiAmount: z.coerce.number().min(0),
  dueDate: z.coerce.number().int().min(1).max(31),
  totalTenureMonths: z.coerce.number().int().positive(),
  remainingMonths: z.coerce.number().int().min(0),
  startDate: z.coerce.date(),
});

export const updateLoanSchema = createLoanSchema.partial();

// ─── Insurance ───────────────────────────────────
export const createInsuranceSchema = z.object({
  type: z.enum(["LIFE", "HEALTH", "VEHICLE", "PROPERTY"]),
  provider: z.string().min(1, "Provider is required").max(100),
  policyNumber: z.string().min(1, "Policy number is required").max(50),
  premiumAmount: z.coerce.number().positive(),
  coverageAmount: z.coerce.number().positive(),
  renewalDate: z.coerce.date(),
  nominee: z.string().max(100).optional(),
});

export const updateInsuranceSchema = createInsuranceSchema.partial();

// ─── Tax Profile ─────────────────────────────────
export const createTaxProfileSchema = z.object({
  financialYear: z.string().regex(/^\d{4}-\d{4}$/, "Format must be YYYY-YYYY (e.g. 2023-2024)"),
  estimatedIncome: z.coerce.number().min(0).optional().default(0),
  totalDeductions: z.coerce.number().min(0).optional().default(0),
  estimatedTax: z.coerce.number().min(0).optional().default(0),
  taxPaid: z.coerce.number().min(0).optional().default(0),
  taxRegime: z.enum(["OLD", "NEW"]).optional().default("NEW"),
  basicSalary: z.coerce.number().min(0).optional().default(0),
  hra: z.coerce.number().min(0).optional().default(0),
  lta: z.coerce.number().min(0).optional().default(0),
  specialAllowance: z.coerce.number().min(0).optional().default(0),
  pfDeduction: z.coerce.number().min(0).optional().default(0),
  ptDeduction: z.coerce.number().min(0).optional().default(0),
  investments80c: z.coerce.number().min(0).optional().default(0),
  medical80d: z.coerce.number().min(0).optional().default(0),
  educationLoan80e: z.coerce.number().min(0).optional().default(0),
  homeLoanInterest24b: z.coerce.number().min(0).optional().default(0),
  nps80ccd: z.coerce.number().min(0).optional().default(0),
  otherDeductions: z.coerce.number().min(0).optional().default(0),
});

export const updateTaxProfileSchema = createTaxProfileSchema.partial();

