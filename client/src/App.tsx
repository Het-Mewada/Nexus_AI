import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/ui/toast-provider";
import { AuthGuard, GuestGuard } from "@/components/guards";
import { DashboardLayout } from "@/app/layouts/DashboardLayout";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Lazy load pages for performance
import { lazy, Suspense } from "react";
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const SignUpPage = lazy(() => import("@/features/auth/SignUpPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const IncomePage = lazy(() => import("@/features/income/IncomePage"));
const ExpensesPage = lazy(() => import("@/features/expenses/ExpensesPage"));
const SalaryPage = lazy(() => import("@/features/salary/SalaryPage"));
const CategoriesPage = lazy(() => import("@/features/categories/CategoriesPage"));
const AnalyticsPage = lazy(() => import("@/features/analytics/AnalyticsPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));
const AIAdvisorChat = lazy(() => import("@/features/ai-advisor/AIAdvisorChat"));

// New Sprint 4 pages
const BudgetPage = lazy(() => import("@/features/budget/BudgetPage"));
const GoalsPage = lazy(() => import("@/features/goals/GoalsPage"));
const BillsPage = lazy(() => import("@/features/bills/BillsPage"));
const SubscriptionsPage = lazy(() => import("@/features/subscriptions/SubscriptionsPage"));
const PortfolioPage = lazy(() => import("@/features/portfolio/PortfolioPage"));
const LiabilitiesPage = lazy(() => import("@/features/liabilities/LiabilitiesPage"));
const TaxPage = lazy(() => import("@/features/tax/TaxPage"));
const FamilyPage = lazy(() => import("@/features/family/FamilyPage"));
const DocumentsPage = lazy(() => import("@/features/documents/DocumentsPage"));
const NotificationsPage = lazy(() => import("@/features/notifications/NotificationsPage"));
const AddressBookPage = lazy(() => import("@/features/contacts/AddressBookPage"));

// Phase 4A pages
const CoachPage = lazy(() => import("@/features/coach/CoachPage"));

// Phase 4B pages
const SmartSavingsPage = lazy(() => import("@/features/smart-savings/SmartSavingsPage"));
const CalendarPage = lazy(() => import("@/features/calendar/CalendarPage"));

// Phase 5 pages
const AiCfoPage = lazy(() => import("@/features/cfo/AiCfoPage"));

// Initialise React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const channel = new BroadcastChannel('nexus-sync');
channel.onmessage = (event) => {
  if (event.data?.type === 'INVALIDATE_QUERIES') {
    queryClient.invalidateQueries();
  }
};

// Loading Fallback
const PageLoader = () => (
  <div className="flex h-[50vh] items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

// Protected Layout Wrapper
const ProtectedLayout = () => {
  return (
    <AuthGuard>
      <DashboardLayout>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    </AuthGuard>
  );
};

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
                <Route path="/signup" element={<GuestGuard><SignUpPage /></GuestGuard>} />
                <Route path="/forgot-password" element={<GuestGuard><ForgotPasswordPage /></GuestGuard>} />
                <Route path="/reset-password" element={<GuestGuard><ResetPasswordPage /></GuestGuard>} />

                {/* Protected Routes */}
                <Route element={<ProtectedLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/ai" element={<AIAdvisorChat />} />
                  <Route path="/income" element={<IncomePage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/salary" element={<SalaryPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  
                  {/* Wealth & Planning */}
                  <Route path="/budgets" element={<BudgetPage />} />
                  <Route path="/goals" element={<GoalsPage />} />
                  <Route path="/coach" element={<CoachPage />} />
                  <Route path="/smart-savings" element={<SmartSavingsPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/cfo" element={<AiCfoPage />} />
                  <Route path="/bills" element={<BillsPage />} />
                  <Route path="/subscriptions" element={<SubscriptionsPage />} />
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/liabilities" element={<LiabilitiesPage />} />
                  <Route path="/tax" element={<TaxPage />} />
                  <Route path="/family" element={<FamilyPage />} />
                  <Route path="/contacts" element={<AddressBookPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />

                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <ToastProvider />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
