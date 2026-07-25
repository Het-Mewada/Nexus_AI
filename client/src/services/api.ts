import { api, type ApiResponse } from "@/lib/api-client";
import type {
  Income, Expense, SalaryRecord, Category, DashboardSummary, ChartData, CashFlowData, User, UserSettings, SearchResults, CategoryBreakdownItem,
  Budget, Goal, Bill, Subscription, Investment, Loan, Insurance, Document, TaxProfile, FamilyGroup, SharedWallet, SharedWalletTransaction, Notification,
  Watchlist, MarketQuote, IpoItem,
  AiConversation, AiInsight, FinancialSimulation, CoachingChallenge, CoachingProgress, DailyTip, WeeklyReview, SimulationResults, Contact, Address
} from "@/types";

// ─── User ────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get<ApiResponse<User>>("/users/me").then((r) => r.data),
  updateProfile: (data: Partial<User>) => api.patch<ApiResponse<User>>("/users/me", data).then((r) => r.data),
  deleteAccount: () => api.delete<ApiResponse<{ message: string }>>("/users/me").then((r) => r.data),
};

// ─── Income ──────────────────────────────────────
export const incomeApi = {
  list: (params?: Record<string, string>) =>
    api.get<ApiResponse<Income[]>>("/income", { params }).then((r) => r.data),
  getById: (id: string) => api.get<ApiResponse<Income>>(`/income/${id}`).then((r) => r.data),
  create: (data: Partial<Income>) => api.post<ApiResponse<Income>>("/income", data).then((r) => r.data),
  update: (id: string, data: Partial<Income>) => api.patch<ApiResponse<Income>>(`/income/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/income/${id}`).then((r) => r.data),
};

// ─── Expenses ────────────────────────────────────
export const expenseApi = {
  list: (params?: Record<string, string>) =>
    api.get<ApiResponse<Expense[]>>("/expenses", { params }).then((r) => r.data),
  getById: (id: string) => api.get<ApiResponse<Expense>>(`/expenses/${id}`).then((r) => r.data),
  create: (data: FormData) =>
    api.post<ApiResponse<Expense>>("/expenses", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  update: (id: string, data: FormData) =>
    api.patch<ApiResponse<Expense>>(`/expenses/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/expenses/${id}`).then((r) => r.data),
};

// ─── Salary ──────────────────────────────────────
export const salaryApi = {
  list: () => api.get<ApiResponse<{ records: SalaryRecord[], balance: { casualLeaves: number, sickLeaves: number } }>>("/salary").then((r) => r.data),
  getById: (id: string) => api.get<ApiResponse<SalaryRecord>>(`/salary/${id}`).then((r) => r.data),
  create: (data: Partial<SalaryRecord>) => api.post<ApiResponse<SalaryRecord>>("/salary", data).then((r) => r.data),
  update: (id: string, data: Partial<SalaryRecord>) => api.patch<ApiResponse<SalaryRecord>>(`/salary/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/salary/${id}`).then((r) => r.data),
};

// ─── Categories ──────────────────────────────────
export const categoryApi = {
  list: () => api.get<ApiResponse<Category[]>>("/categories").then((r) => r.data),
  create: (data: Partial<Category>) => api.post<ApiResponse<Category>>("/categories", data).then((r) => r.data),
  update: (id: string, data: Partial<Category>) => api.patch<ApiResponse<Category>>(`/categories/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/categories/${id}`).then((r) => r.data),
};

// ─── Analytics ───────────────────────────────────
export const analyticsApi = {
  getDashboard: () => api.get<ApiResponse<DashboardSummary>>("/analytics/dashboard").then((r) => r.data),
  getCharts: (year?: number) =>
    api.get<ApiResponse<ChartData>>("/analytics/charts", { params: { year } }).then((r) => r.data),
  getCashFlow: (year?: number) =>
    api.get<ApiResponse<CashFlowData>>("/analytics/cashflow", { params: { year } }).then((r) => r.data),
  getCategoryBreakdown: (year?: number, month?: number) =>
    api.get<ApiResponse<CategoryBreakdownItem[]>>("/analytics/categories", { params: { year, month } }).then((r) => r.data),
};

// ─── Settings ────────────────────────────────────
export const settingsApi = {
  get: () => api.get<ApiResponse<UserSettings>>("/settings").then((r) => r.data),
  update: (data: Partial<UserSettings>) => api.patch<ApiResponse<UserSettings>>("/settings", data).then((r) => r.data),
};

// ─── Search ──────────────────────────────────────
export const searchApi = {
  search: (q: string, type?: string) =>
    api.get<ApiResponse<SearchResults>>("/search", { params: { q, type } }).then((r) => r.data),
};

// ─── Export ──────────────────────────────────────
export const exportApi = {
  csv: () =>
    api.get("/export/csv", { responseType: "blob" }).then((r) => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `moneyos-export-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }),
};

// ─── AI ──────────────────────────────────────────
export const aiApi = {
  getInsights: () => api.get<ApiResponse<{ insights: string[] }>>("/ai/insights").then((r) => r.data),
  chat: (query: string) => api.post<ApiResponse<{ role: string; content: string }>>("/ai/chat", { query }).then((r) => r.data),
  categorize: (merchant: string, description?: string) => api.post<ApiResponse<{ category: string }>>("/ai/categorize", { merchant, description }).then((r) => r.data),
};

// ─── Budgets ─────────────────────────────────────
export const budgetApi = {
  list: () => api.get<ApiResponse<Budget[]>>("/budgets").then((r) => r.data),
  create: (data: Partial<Budget>) => api.post<ApiResponse<Budget>>("/budgets", data).then((r) => r.data),
  update: (id: string, data: Partial<Budget>) => api.patch<ApiResponse<Budget>>(`/budgets/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/budgets/${id}`).then((r) => r.data),
};

// ─── Goals ───────────────────────────────────────
export const goalApi = {
  list: () => api.get<ApiResponse<Goal[]>>("/goals").then((r) => r.data),
  create: (data: Partial<Goal>) => api.post<ApiResponse<Goal>>("/goals", data).then((r) => r.data),
  update: (id: string, data: Partial<Goal>) => api.patch<ApiResponse<Goal>>(`/goals/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/goals/${id}`).then((r) => r.data),
};

// ─── Bills ───────────────────────────────────────
export const billApi = {
  list: () => api.get<ApiResponse<Bill[]>>("/bills").then((r) => r.data),
  create: (data: Partial<Bill>) => api.post<ApiResponse<Bill>>("/bills", data).then((r) => r.data),
  update: (id: string, data: Partial<Bill>) => api.patch<ApiResponse<Bill>>(`/bills/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/bills/${id}`).then((r) => r.data),
};

// ─── Subscriptions ───────────────────────────────
export const subscriptionApi = {
  list: () => api.get<ApiResponse<any[]>>("/subscriptions").then((r) => {
    return {
      ...r.data,
      data: r.data.data?.map(sub => ({
        ...sub,
        nextBillingDate: sub.nextPayment
      })) || []
    };
  }),
  create: (data: Partial<Subscription>) => {
    const payload: any = { ...data, nextPayment: (data as any).nextBillingDate };
    delete payload.nextBillingDate;
    return api.post<ApiResponse<Subscription>>("/subscriptions", payload).then((r) => r.data);
  },
  update: (id: string, data: Partial<Subscription>) => {
    const payload: any = { ...data };
    if (payload.nextBillingDate) {
      payload.nextPayment = payload.nextBillingDate;
      delete payload.nextBillingDate;
    }
    return api.patch<ApiResponse<Subscription>>(`/subscriptions/${id}`, payload).then((r) => r.data);
  },
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/subscriptions/${id}`).then((r) => r.data),
};

// ─── Tax Profiles ────────────────────────────────
export const taxApi = {
  list: () => api.get<ApiResponse<any[]>>("/taxes").then((r) => {
    return {
      ...r.data,
      data: r.data.data?.map(p => ({
        ...p,
        assessmentYear: p.financialYear
      })) || []
    };
  }),
  create: (data: Partial<TaxProfile>) => {
    const payload: any = { ...data, financialYear: (data as any).assessmentYear };
    delete payload.assessmentYear;
    return api.post<ApiResponse<TaxProfile>>("/taxes", payload).then((r) => r.data);
  },
  update: (id: string, data: Partial<TaxProfile>) => {
    const payload: any = { ...data };
    if (payload.assessmentYear) {
      payload.financialYear = payload.assessmentYear;
      delete payload.assessmentYear;
    }
    return api.patch<ApiResponse<TaxProfile>>(`/taxes/${id}`, payload).then((r) => r.data);
  },
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/taxes/${id}`).then((r) => r.data),
};

// ─── Wealth (Investments & Liabilities) ──────────
export const investmentApi = {
  getPortfolio: () => api.get<ApiResponse<any>>("/investments/portfolio").then((r) => r.data),
  addInvestment: (data: Partial<Investment>) => api.post<ApiResponse<Investment>>("/investments/portfolio", data).then((r) => r.data),
  updateInvestment: (id: string, data: Partial<Investment>) => api.patch<ApiResponse<Investment>>(`/investments/portfolio/${id}`, data).then((r) => r.data),
  deleteInvestment: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/investments/portfolio/${id}`).then((r) => r.data),
  sellInvestment: (data: { symbol: string, quantity: number, currentPrice: number }) => api.post<ApiResponse<{ message: string }>>("/investments/portfolio/sell", data).then((r) => r.data),
  searchMarket: (query: string) => api.get<ApiResponse<any[]>>("/investments/market/search", { params: { query } }).then((r) => r.data),
};

export const liabilityApi = {
  getLoans: () => api.get<ApiResponse<Loan[]>>("/liabilities/loans").then((r) => r.data),
  addLoan: (data: Partial<Loan>) => api.post<ApiResponse<Loan>>("/liabilities/loans", data).then((r) => r.data),
  updateLoan: (id: string, data: Partial<Loan>) => api.patch<ApiResponse<Loan>>(`/liabilities/loans/${id}`, data).then((r) => r.data),
  deleteLoan: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/liabilities/loans/${id}`).then((r) => r.data),
  getInsurance: () => api.get<ApiResponse<Insurance[]>>("/liabilities/insurance").then((r) => r.data),
  addInsurance: (data: Partial<Insurance>) => api.post<ApiResponse<Insurance>>("/liabilities/insurance", data).then((r) => r.data),
  updateInsurance: (id: string, data: Partial<Insurance>) => api.patch<ApiResponse<Insurance>>(`/liabilities/insurance/${id}`, data).then((r) => r.data),
  deleteInsurance: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/liabilities/insurance/${id}`).then((r) => r.data),
};

// ─── Family & Documents ──────────────────────────
export const familyApi = {
  getGroups: () => api.get<ApiResponse<FamilyGroup[]>>("/family").then((r) => r.data),
  createGroup: (name: string) => api.post<ApiResponse<FamilyGroup>>("/family", { name }).then((r) => r.data),
  joinGroup: (inviteCode: string) => api.post<ApiResponse<any>>("/family/join", { inviteCode }).then((r) => r.data),
  getWallets: (groupId: string) => api.get<ApiResponse<SharedWallet[]>>(`/family/${groupId}/wallets`).then((r) => r.data),
  createWallet: (groupId: string, name: string) => api.post<ApiResponse<SharedWallet>>(`/family/${groupId}/wallets`, { name }).then((r) => r.data),
  updateWallet: (walletId: string, name: string) => api.patch<ApiResponse<SharedWallet>>(`/family/wallets/${walletId}`, { name }).then((r) => r.data),
  deleteWallet: (walletId: string) => api.delete<ApiResponse<{ message: string }>>(`/family/wallets/${walletId}`).then((r) => r.data),
  getTransactions: (walletId: string) => api.get<ApiResponse<SharedWalletTransaction[]>>(`/family/wallets/${walletId}/transactions`).then((r) => r.data),
  addTransaction: (walletId: string, data: { type: string; amount: number; description?: string }) => api.post<ApiResponse<SharedWalletTransaction>>(`/family/wallets/${walletId}/transactions`, data).then((r) => r.data),
};

export const documentApi = {
  getDocuments: () => api.get<ApiResponse<Document[]>>("/documents").then((r) => r.data),
  uploadDocument: (data: FormData) => api.post<ApiResponse<Document>>("/documents", data, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  deleteDocument: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/documents/${id}`).then((r) => r.data),
};

// ─── Notifications ───────────────────────────────
export const notificationApi = {
  list: () => api.get<ApiResponse<{ notifications: Notification[], unreadCount: number }>>("/notifications").then((r) => r.data),
  markRead: (id: string) => api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post<ApiResponse<{ message: string }>>("/notifications/read-all").then((r) => r.data),
};

// ─── Market ──────────────────────────────────────
export const marketApi = {
  searchStock: (query: string) => api.get<ApiResponse<MarketQuote[]>>("/market/search", { params: { query } }).then((r) => r.data),
  getQuote: (symbol: string) => api.get<ApiResponse<MarketQuote>>(`/market/quote/${symbol}`).then((r) => r.data),
  getChart: (symbol: string, interval?: string, range?: string) => api.get<ApiResponse<any>>(`/market/chart/${symbol}`, { params: { interval, range } }).then((r) => r.data),
  getIpos: () => api.get<ApiResponse<IpoItem[]>>("/market/ipos").then((r) => r.data),
  getWatchlist: () => api.get<ApiResponse<Watchlist[]>>("/market/watchlist").then((r) => r.data),
  addToWatchlist: (symbol: string, name?: string) => api.post<ApiResponse<Watchlist>>("/market/watchlist", { symbol, name }).then((r) => r.data),
  removeFromWatchlist: (symbol: string) => api.delete<ApiResponse<{ message: string }>>(`/market/watchlist/${symbol}`).then((r) => r.data),
};

// ─── Calendar ─────────────────────────────────────
export const calendarApi = {
  getEvents: (month?: number, year?: number) => api.get<ApiResponse<any[]>>("/calendar", { params: { month, year } }).then((r) => r.data),
  getEvent: (id: string) => api.get<ApiResponse<any>>(`/calendar/${id}`).then((r) => r.data),
  createEvent: (data: any) => api.post<ApiResponse<any>>("/calendar", data).then((r) => r.data),
  updateEvent: (id: string, data: any) => api.put<ApiResponse<any>>(`/calendar/${id}`, data).then((r) => r.data),
  deleteEvent: (id: string) => api.delete<ApiResponse<any>>(`/calendar/${id}`).then((r) => r.data),
};

// ─── Phase 4A: AI Financial Agent & Coach ────────
export const conversationApi = {
  list: () => api.get<ApiResponse<AiConversation[]>>("/conversations").then((r) => r.data.data),
  getById: (id: string) => api.get<ApiResponse<AiConversation>>(`/conversations/${id}`).then((r) => r.data.data),
  create: (title?: string) => api.post<ApiResponse<AiConversation>>("/conversations", { title }).then((r) => r.data.data),
  updateConversation: (id: string, data: { title?: string; isPinned?: boolean }) => api.patch<ApiResponse<AiConversation>>(`/conversations/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/conversations/${id}`).then((r) => r.data.data),
  sendMessage: (id: string, message: string) => api.post<ApiResponse<any>>(`/conversations/${id}/messages`, { message }).then((r) => r.data.data),
};

export const financialAgentApi = {
  getInsights: () => api.get<ApiResponse<AiInsight[]>>("/agent/insights").then((r) => r.data.data),
  runAnalysis: () => api.post<ApiResponse<AiInsight[]>>("/agent/analyze").then((r) => r.data.data),
  markInsightRead: (id: string) => api.patch<ApiResponse<{ message: string }>>(`/agent/insights/${id}/read`).then((r) => r.data.data),
  dismissInsight: (id: string) => api.patch<ApiResponse<{ message: string }>>(`/agent/insights/${id}/dismiss`).then((r) => r.data.data),
};

export const coachApi = {
  getDailyTip: () => api.get<ApiResponse<DailyTip>>("/coach/daily-tip").then((r) => r.data.data),
  getWeeklyReview: () => api.get<ApiResponse<WeeklyReview>>("/coach/weekly-review").then((r) => r.data.data),
  getChallenges: () => api.get<ApiResponse<CoachingChallenge[]>>("/coach/challenges").then((r) => r.data.data),
  getMyChallenges: () => api.get<ApiResponse<CoachingProgress[]>>("/coach/my-challenges").then((r) => r.data.data),
  startChallenge: (id: string) => api.post<ApiResponse<CoachingProgress>>(`/coach/challenges/${id}/start`).then((r) => r.data.data),
  updateProgress: (id: string, progressPct: number) => api.patch<ApiResponse<CoachingProgress>>(`/coach/challenges/${id}/progress`, { progressPct }).then((r) => r.data.data),
};

// ─── Phase 5: AI CFO ─────────────────────────────
export const aiCfoApi = {
  getRecommendations: () => api.get<any[]>("/ai-cfo/recommendations").then((r) => r.data),
  updateStatus: (id: string, status: "ACCEPTED" | "DISMISSED" | "POSTPONED") => api.patch<any>(`/ai-cfo/recommendations/${id}/status`, { status }).then((r) => r.data),
  generateManual: () => api.post<any[]>("/ai-cfo/recommendations/generate").then((r) => r.data),
};

// ─── Phase 5: Spending Behavior ──────────────────
export const spendingBehaviorApi = {
  getInsights: () => api.get<any[]>("/spending-behavior/insights").then((r) => r.data),
  analyze: () => api.post<any>("/spending-behavior/analyze").then((r) => r.data),
};

// ─── Phase 5: Negotiation Assistant ──────────────
export const negotiationApi = {
  startNegotiation: (topic: string) => api.post<any>("/negotiation/start", { topic }).then((r) => r.data),
};

// ─── Contacts ────────────────────────────────────
export const contactsApi = {
  list: (params?: Record<string, string>) => api.get<ApiResponse<Contact[]>>("/contacts", { params }).then((r) => r.data),
  getById: (id: string) => api.get<ApiResponse<Contact>>(`/contacts/${id}`).then((r) => r.data),
  create: (data: Partial<Contact>) => api.post<ApiResponse<Contact>>("/contacts", data).then((r) => r.data),
  update: (id: string, data: Partial<Contact>) => api.put<ApiResponse<Contact>>(`/contacts/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/contacts/${id}`).then((r) => r.data),
};

// ─── Addresses ───────────────────────────────────
export const addressesApi = {
  list: (params?: Record<string, string>) => api.get<ApiResponse<Address[]>>("/addresses", { params }).then((r) => r.data),
  getById: (id: string) => api.get<ApiResponse<Address>>(`/addresses/${id}`).then((r) => r.data),
  create: (data: Partial<Address>) => api.post<ApiResponse<Address>>("/addresses", data).then((r) => r.data),
  update: (id: string, data: Partial<Address>) => api.put<ApiResponse<Address>>(`/addresses/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<{ message: string }>>(`/addresses/${id}`).then((r) => r.data),
};
