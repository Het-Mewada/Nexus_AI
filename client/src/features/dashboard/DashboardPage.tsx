import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, BarChart3, Receipt, Clock, Sparkles, AlertTriangle
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis,
  YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyticsApi, aiApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardSummary, ChartData } from "@/types";
import { AgentInsights } from "@/features/ai-advisor/components/AgentInsights";
import { PageHeader } from "@/components/ui/page-header";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-2xl md:text-3xl font-bold tracking-tight"
    >
      {prefix}{formatCurrency(value)}
    </motion.span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const year = new Date().getFullYear();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => analyticsApi.getDashboard(),
    select: (res) => res.data,
  });

  const { data: charts } = useQuery({
    queryKey: ["charts", year],
    queryFn: () => analyticsApi.getCharts(year),
    select: (res) => res.data,
  });

  const d = dashboard as DashboardSummary | undefined;
  const c = charts as ChartData | undefined;
  const currentDayOfMonth = new Date().getDate();
  const dailyAverageSpending = (d?.monthlyExpenses || 0) / currentDayOfMonth;

  const { data: aiData, isLoading: aiLoading } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: () => aiApi.getInsights(),
    select: (res) => res.data,
  });

  if (dashLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-20 bg-muted rounded-lg" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-64 bg-muted rounded-lg" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Current Balance",
      value: d?.currentBalance || 0,
      icon: Wallet,
      trend: d?.currentBalance && d.currentBalance > 0 ? "up" : "down",
      color: "from-primary to-primary",
      bgColor: "bg-primary/10",
      textColor: "text-primary",
    },
    {
      title: "Monthly Income",
      value: d?.monthlyIncome || 0,
      icon: TrendingUp,
      color: "from-primary to-primary",
      bgColor: "bg-primary/10",
      textColor: "text-primary",
    },
    {
      title: "Monthly Expenses",
      value: d?.monthlyExpenses || 0,
      icon: TrendingDown,
      color: "from-primary to-primary",
      bgColor: "bg-primary/10",
      textColor: "text-primary",
    },
    {
      title: "Daily Avg. Spending",
      value: dailyAverageSpending,
      icon: TrendingDown,
      color: "from-primary to-primary",
      bgColor: "bg-primary/10",
      textColor: "text-primary",
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={item}>
        <PageHeader title="Dashboard" description={`Good to see you, ${user?.name || "there"}. A focused view of your cash flow, commitments, and the next decisions worth making.`} />
      </motion.div>

      {/* AI Financial Agent Insights */}
      <motion.div variants={item}>
        <AgentInsights />
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.title} variants={item} className="h-full">
            <Card className="group relative h-full rounded-[18px] border border-border/80 bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex h-full flex-col justify-between p-5 text-left md:p-6">
                <div className="relative mb-4 flex w-full items-center justify-between">
                  <div className={`p-3 rounded-2xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                    {index === 0 && user?.initialBalance == null && (
                      <span
                        aria-label="Initial balance is not set. Set it in Settings, Profile, Initial Balance."
                        tabIndex={0}
                        className="group/initial-balance relative inline-flex cursor-help rounded-sm text-warning outline-none focus-visible:ring-2 focus-visible:ring-warning/40"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-78 rounded-xl border border-warning/25 bg-popover px-3.5 py-3 text-left text-xs leading-relaxed text-popover-foreground shadow-xl group-hover/initial-balance:block group-focus-within/initial-balance:block">
                          <span className="mb-1 block font-semibold text-warning">Initial balance needed</span>
                          You have not set your initial balance (cash + bank). Add it to calculate current balance and future cash flow accurately.
                          <span className="mt-1.5 block font-medium text-muted-foreground">Settings → Profile → Initial Balance</span>
                        </span>
                      </span>
                    )}
                  </p>
                  <AnimatedNumber value={stat.value} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>


      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_.85fr]">
        {/* Expense Category Pie Chart */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-primary" />
                Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {d?.categoryBreakdown && d.categoryBreakdown.length > 0 ? (
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={d.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="total"
                        nameKey="name"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {d.categoryBreakdown.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.4)" }}
                        labelStyle={{ color: "var(--color-foreground)", fontWeight: "bold", marginBottom: "4px" }}
                        itemStyle={{ color: "var(--color-foreground)" }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 min-w-[140px]">
                    {d.categoryBreakdown.slice(0, 5).map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="truncate flex-1">{cat.name}</span>
                        <span className="font-medium text-xs">{formatCurrency(cat.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                  <PiggyBank className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No expenses this month yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Comparison */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-primary" />
                Monthly Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {c?.monthlyComparison ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={c.monthlyComparison.filter((m) => m.income > 0 || m.expense > 0).length > 0 ? c.monthlyComparison : c.monthlyComparison.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(0, 3)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.4)" }}
                      labelStyle={{ color: "var(--color-foreground)", fontWeight: "bold", marginBottom: "4px" }}
                      itemStyle={{ color: "var(--color-foreground)" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">Loading chart data...</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Insights Widget */}
      <motion.div variants={item}>
        <Card className="border-l-4 border-l-primary bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Sparkles className="h-5 w-5" />
              AI Financial Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </div>
            ) : aiData?.insights && aiData.insights.length > 0 ? (
              <ul className="space-y-3">
                {aiData.insights.map((insight, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <div className="mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No insights available right now.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Row */}
      <div className="space-y-6">
        {/* Recent Transactions */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-5 w-5 text-primary" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                let displayedTransactions = d?.recentTransactions || [];
                if (searchQuery) {
                  displayedTransactions = displayedTransactions.filter(
                    (tx) =>
                      tx.merchant.toLowerCase().includes(searchQuery) ||
                      tx.category.name.toLowerCase().includes(searchQuery) ||
                      tx.amount.toString().includes(searchQuery)
                  );
                }

                if (displayedTransactions.length > 0) {
                  return (
                    <div className="space-y-3">
                      {displayedTransactions.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tx.category.color}15` }}>
                            <Receipt className="h-4 w-4" style={{ color: tx.category.color }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tx.merchant}</p>
                            <p className="text-xs text-muted-foreground">{tx.category.name} · {formatDate(tx.date)}</p>
                          </div>
                          <span className="text-sm font-semibold text-rose-500">-{formatCurrency(Number(tx.amount))}</span>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">
                      {searchQuery ? "No transactions found for your search" : "No transactions yet"}
                    </p>
                    {!searchQuery && <p className="text-xs mt-1">Add your first expense to get started</p>}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Spending + Upcoming Bills */}
        <motion.div variants={item} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Spending */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              {d?.topSpendingCategory ? (
                <div className="text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: `${d.topSpendingCategory.color}15` }}>
                    <BarChart3 className="h-6 w-6" style={{ color: d.topSpendingCategory.color }} />
                  </div>
                  <p className="font-semibold text-lg">{d.topSpendingCategory.name}</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(d.topSpendingCategory.total)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.topSpendingCategory.count} transactions</p>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">No spending data</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Bills */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-primary" />
                Upcoming Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {d?.upcomingBills && d.upcomingBills.length > 0 ? (
                <div className="space-y-3">
                  {d.upcomingBills.slice(0, 3).map((bill) => {
                    const dueDate = new Date(bill.dueDate);
                    const isOverdue = dueDate < new Date();
                    const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{bill.name}</p>
                          <p className={`text-xs mt-1 ${isOverdue ? 'text-rose-500 font-medium' : 'text-muted-foreground'}`}>
                            {isOverdue ? 'Overdue' : daysLeft === 0 ? 'Due today' : `Due in ${daysLeft} days`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {formatCurrency(Number(bill.amount))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No upcoming bills</p>
                  <p className="text-xs mt-1">You're all caught up!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Cash Flow Line Chart */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {c?.monthlyComparison ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={c.monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(0, 3)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.4)" }}
                    labelStyle={{ color: "var(--color-foreground)", fontWeight: "bold", marginBottom: "4px" }}
                    itemStyle={{ color: "var(--color-foreground)" }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="cashFlow" name="Cash Flow" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">Loading...</div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
