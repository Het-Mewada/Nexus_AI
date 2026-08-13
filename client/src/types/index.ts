export interface User {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  currency: string;
  timezone: string;
  theme: string;
  monthlySalary: number | null;
  createdAt: string;
  updatedAt: string;
  initialBalance: number | null;
  settings?: UserSettings;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
}

export interface UserSettings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  date: string;
  notes: string | null;
  isRecurring: boolean;
  currency: string;
  isAutoSynced: boolean;
  syncSource?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  merchant: string;
  date: string;
  paymentMethod: string;
  notes: string | null;
  tags: string[];
  receiptUrl: string | null;
  receiptPath: string | null;
  isAutoSynced: boolean;
  syncSource?: string;
  createdAt: string;
  category: Category;
}

export interface SalaryRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  baseSalary: number;
  leaves: number;
  halfDays: number;
  bonus: number;
  otherDeductions: number;
  expectedSalary: number;
  actualCredited?: number;
  creditedDate?: string;
  isSynced?: boolean;
  discrepancyReason?: string;
  createdAt: string;
}

export interface DashboardSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  netCashFlow: number;
  recentTransactions: Expense[];
  categoryBreakdown: CategoryBreakdownItem[];
  topSpendingCategory: CategoryBreakdownItem | null;
  upcomingBills: Bill[];
}

export interface CategoryBreakdownItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  count: number;
}

export interface MonthlyComparisonItem {
  month: string;
  monthNumber: number;
  income: number;
  expense: number;
  cashFlow: number;
}

export interface CashFlowItem {
  month: string;
  monthNumber: number;
  income: number;
  expense: number;
  net: number;
  runningBalance: number;
}

export interface ChartData {
  monthlyComparison: MonthlyComparisonItem[];
  year: number;
}

export interface CashFlowData {
  cashFlow: CashFlowItem[];
  year: number;
}

export interface SearchResults {
  incomes: Income[];
  expenses: Expense[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  period: 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string | null;
  alertThreshold: number;
  category: Category;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  color: string;
  icon: string;
}

export interface Bill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  isRecurring: boolean;
  reminderDays: number;
  category?: Category;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
  nextBillingDate: string;
  status: 'ACTIVE' | 'CANCELLED';
  url: string | null;
  category?: Category;
}

export interface Investment {
  id: string;
  userId: string;
  type: string;
  name: string;
  symbol: string | null;
  quantity: number | null;
  investedAmount: number;
  currentPrice: number | null;
  purchaseDate: string;
}

export interface Loan {
  id: string;
  userId: string;
  type: string;
  name: string;
  principalAmount: number;
  outstandingAmount: number;
  interestRate: number;
  emiAmount: number;
  totalTenureMonths: number;
  remainingMonths: number;
  startDate: string;
  dueDate: number;
}

export interface Insurance {
  id: string;
  userId: string;
  type: string;
  provider: string;
  policyNumber: string;
  premiumAmount: number;
  coverageAmount: number;
  renewalDate: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  title: string;
  type: string;
  fileUrl: string;
  filePath: string;
  createdAt: string;
}

export interface TaxProfile {
  id: string;
  userId: string;
  taxRegime: 'OLD' | 'NEW';
  assessmentYear: string;
  basicSalary: number;
  hra: number;
  lta: number;
  specialAllowance: number;
  pfDeduction: number;
  ptDeduction: number;
  investments80c: number;
  medical80d: number;
  educationLoan80e: number;
  homeLoanInterest24b: number;
  nps80ccd: number;
  otherDeductions: number;
}

export interface FamilyGroup {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  members: GroupMember[];
  wallets: SharedWallet[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface SharedWallet {
  id: string;
  familyGroupId: string;
  name: string;
  balance: number;
  createdAt: string;
  transactions?: SharedWalletTransaction[];
}

export interface SharedWalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  description: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  wallet?: {
    id: string;
    name: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: any;
  createdAt: string;
}

export interface Watchlist {
  id: string;
  userId: string;
  symbol: string;
  name?: string;
  createdAt: string;
}

export interface MarketQuote {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  marketState?: string;
}

export interface IpoItem {
  id: string;
  name: string;
  date: string;
  size: string;
  type?: string;
  price: string;
  status: 'Upcoming' | 'Live' | 'Closed';
  gmpPercent?: string | null;
  estRetailProfit?: string;
  estHniProfit?: string;
  subscription?: string;
  links?: { title: string, url: string }[];
}

// ─── Phase 4A Types ──────────────────────────────

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: AiMessage[];
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  tokenCount?: number;
  createdAt: string;
}

export interface AiInsight {
  id: string;
  userId: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  isDismissed: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface FinancialSimulation {
  id: string;
  userId: string;
  scenario: string;
  title: string;
  parameters: any;
  results: SimulationResults;
  createdAt: string;
}

export interface SimulationResults {
  summary: string;
  netWorthImpact: { current: number; projected: number; change: number; changePercent: number };
  cashFlowImpact: { currentMonthly: number; projectedMonthly: number; change: number };
  debtImpact: { currentTotal: number; projectedTotal: number; currentEMI: number; projectedEMI: number };
  savingsImpact: { currentRate: number; projectedRate: number };
  goalImpact: { goalName: string; currentProgress: number; projectedProgress: number; delayMonths: number }[];
  riskAssessment: { level: string; factors: string[] };
  recommendation: string;
  projections: { month: number; netWorth: number; savings: number }[];
}

export interface CoachingChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  durationDays: number;
  targetMetric?: string;
  isActive: boolean;
}

export interface CoachingProgress {
  id: string;
  userId: string;
  challengeId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt: string;
  completedAt?: string;
  progressPct: number;
  notes?: string;
  challenge: CoachingChallenge;
}

export interface WeeklyReview {
  summary: string;
  weekSpent: number;
  weekIncome: number;
  topCategory: string;
  topCategoryAmount: number;
  savingsRate: number;
  strengths: string[];
  improvements: string[];
  weekScore: number;
}

export interface DailyTip {
  tip: string;
  category: string;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  birthday: string | null;
  socialMediaLinks: Record<string, string> | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  title: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  replies?: FeedbackReply[];
}

export interface FeedbackReply {
  id: string;
  feedbackId: string;
  userId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}
