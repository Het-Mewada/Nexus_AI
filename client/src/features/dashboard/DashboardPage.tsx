import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight,
  ArrowDownRight, BarChart3, Receipt, Clock, Sparkles
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis,
  YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyticsApi, aiApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardSummary, ChartData } from "@/types";
import { AgentInsights } from "@/features/ai-advisor/components/AgentInsights";

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
      color: "from-indigo-500 to-purple-500",
      bgColor: "bg-indigo-500/10",
      textColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      title: "Monthly Income",
      value: d?.monthlyIncome || 0,
      icon: TrendingUp,
      trend: "up",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Monthly Expenses",
      value: d?.monthlyExpenses || 0,
      icon: TrendingDown,
      trend: "down",
      color: "from-rose-500 to-pink-500",
      bgColor: "bg-rose-500/10",
      textColor: "text-rose-600 dark:text-rose-400",
    },
    {
      title: "Savings Rate",
      value: d?.savingsRate || 0,
      icon: PiggyBank,
      trend: d?.savingsRate && d.savingsRate > 0 ? "up" : "down",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-600 dark:text-amber-400",
      isSavings: true,
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back, <span className="gradient-text">{user?.name || "there"}</span> 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's your financial overview for this month.</p>
      </motion.div>

      {/* AI Financial Agent Insights */}
      <motion.div variants={item}>
        <AgentInsights />
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
                  </div>
                  {stat.isSavings ? (
                    <Badge variant={stat.value >= 20 ? "success" : "warning"}>
                      {stat.value.toFixed(1)}%
                    </Badge>
                  ) : (
                    <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend === "up" ? "text-emerald-500" : "text-rose-500"}`}>
                      {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  {stat.isSavings ? (
                    <div>
                      <span className="text-2xl md:text-3xl font-bold">{stat.value.toFixed(1)}%</span>
                      <Progress value={Math.min(100, stat.value)} className="mt-2 h-1.5" indicatorClassName={stat.value >= 20 ? "bg-emerald-500" : "bg-amber-500"} />
                    </div>
                  ) : (
                    <AnimatedNumber value={stat.value} />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
        <Card className="bg-gradient-to-br from-primary/5 via-background to-purple-500/5 border-primary/20">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <motion.div variants={item} className="lg:col-span-2">
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
                            <TrendingDown className="h-4 w-4" style={{ color: tx.category.color }} />
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
        <motion.div variants={item} className="flex flex-col gap-6 h-full">
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
          <Card className="flex-1">
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
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
