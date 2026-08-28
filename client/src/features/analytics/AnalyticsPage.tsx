import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";
import { Download, PieChart as PieChartIcon, TrendingUp, TrendingDown, PiggyBank, FileSpreadsheet, FileText, Presentation, Braces, Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyticsApi, exportApi } from "@/services/api";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { ChartData, CashFlowData, CategoryBreakdownItem } from "@/types";
import { generateAnalyticsExport, type AnalyticsExportFormat } from "@/lib/analytics-export";

export default function AnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const { user } = useAuth();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [isExporting, setIsExporting] = useState(false);

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ["charts", year],
    queryFn: () => analyticsApi.getCharts(year),
    select: (res) => res.data as ChartData,
  });

  const { data: cashFlow, isLoading: cashFlowLoading } = useQuery({
    queryKey: ["cashflow", year],
    queryFn: () => analyticsApi.getCashFlow(year),
    select: (res) => res.data as CashFlowData,
  });

  const { data: categoryBreakdown, isLoading: categoryLoading } = useQuery({
    queryKey: ["category-breakdown", year, month],
    queryFn: () => analyticsApi.getCategoryBreakdown(year, month),
    select: (res) => res.data as CategoryBreakdownItem[],
  });

  const handleExport = async (format: "csv" | AnalyticsExportFormat) => {
    setIsExporting(true);
    try {
      if (format === "csv") {
        await exportApi.csv();
      } else {
        await generateAnalyticsExport(format, { year, currencyCode: user?.currency || "INR", charts, cashFlow, categories: categoryBreakdown });
      }
      toast.success(`${format.toUpperCase()} export downloaded`);
    } catch {
      toast.error(`Failed to create ${format.toUpperCase()} export`);
    } finally {
      setIsExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-auto lg:h-[calc(100vh-9.25rem)] space-y-6 lg:space-y-4 overflow-y-auto lg:overflow-hidden pb-6 lg:pb-0">
      {/* Header section above divider - unchanged */}
      <div className="flex flex-col border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Deep dive into your financial data</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting} className="gap-2">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isExporting ? "Preparing..." : "Export report"}
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleExport("csv")}><Download className="h-4 w-4" /> CSV data export</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx")}><FileSpreadsheet className="h-4 w-4" /> Excel workbook</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}><FileText className="h-4 w-4" /> Styled PDF report</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pptx")}><Presentation className="h-4 w-4" /> PowerPoint deck</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("json")}><Braces className="h-4 w-4" /> JSON data</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content below divider - scrollable on mobile (< lg), 100vh fixed on desktop (>= lg) */}
      <div className="flex flex-col flex-1 min-h-0 gap-6 lg:gap-3.5 overflow-visible lg:overflow-hidden bg-background p-2 md:p-3 rounded-2xl border border-border/40">
        {/* Top Row: Income vs Expenses & Cash Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-3.5 lg:flex-[0.9] shrink-0 lg:shrink lg:min-h-0">
          {/* Income vs Expenses Bar Chart */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="min-h-0 lg:h-full">
            <Card className="h-full flex flex-col min-h-0 overflow-hidden bg-card border-border/80 shadow-none rounded-[16px]">
              <CardHeader className="py-2.5 px-4 shrink-0 border-b border-border/60 bg-card">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Income vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[270px] lg:h-full lg:flex-1 min-h-0 p-2.5 pt-1">
                {chartsLoading ? (
                  <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
                ) : charts?.monthlyComparison && charts.monthlyComparison.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.monthlyComparison} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" interval={0} tick={{ fontSize: 11 }} tickFormatter={(value) => String(value).slice(0, 3)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.4)" }}
                        labelStyle={{ color: "var(--color-foreground)", fontWeight: "bold", marginBottom: "4px" }}
                        itemStyle={{ color: "var(--color-foreground)" }}
                        formatter={(value: number) => formatCurrency(value, user?.currency)}
                      />
                      <Legend wrapperStyle={{ paddingTop: 2, fontSize: 11 }} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for {year}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Cash Flow Line Chart */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="min-h-0 lg:h-full">
            <Card className="h-full flex flex-col min-h-0 overflow-hidden bg-card border-border/80 shadow-none rounded-[16px]">
              <CardHeader className="py-2.5 px-4 shrink-0 border-b border-border/60 bg-card">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-primary" /> Net Cash Flow & Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] sm:h-[270px] lg:h-full lg:flex-1 min-h-0 p-2.5 pt-1">
                {cashFlowLoading ? (
                  <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
                ) : cashFlow?.cashFlow && cashFlow.cashFlow.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashFlow.cashFlow} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" interval={0} tick={{ fontSize: 11 }} tickFormatter={(value) => String(value).slice(0, 3)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, user?.currency)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.4)" }}
                        labelStyle={{ color: "var(--color-foreground)", fontWeight: "bold", marginBottom: "4px" }}
                        itemStyle={{ color: "var(--color-foreground)" }}
                        formatter={(value: number) => formatCurrency(value, user?.currency)}
                      />
                      <Legend wrapperStyle={{ paddingTop: 2, fontSize: 11 }} />
                      <Line type="monotone" dataKey="net" name="Net Cash Flow" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="runningBalance" name="Running Balance" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for {year}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Row: Spending by Category */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:flex-[1.1] shrink-0 lg:shrink lg:min-h-0 lg:h-full">
          <Card className="h-full flex flex-col min-h-0 overflow-hidden bg-card border-border/80 shadow-none rounded-[16px]">
            <CardHeader className="py-2 px-4 shrink-0 border-b border-border/60 bg-card flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" /> Spending by Category
              </CardTitle>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => <SelectItem key={m} value={String(m)} className="text-xs">{getMonthName(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-3 md:flex-1 md:min-h-0 overflow-visible md:overflow-hidden">
              {categoryLoading ? (
                <div className="h-[300px] md:h-full w-full bg-muted animate-pulse rounded-lg" />
              ) : categoryBreakdown && categoryBreakdown.length > 0 ? (
                <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:h-full items-center md:min-h-0">
                  {/* Donut Chart with Center Metric */}
                  <div className="relative h-[230px] sm:h-[250px] md:h-full w-full shrink-0 flex items-center justify-center min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius="52%"
                          outerRadius="85%"
                          paddingAngle={3}
                          dataKey="total"
                          nameKey="name"
                          animationDuration={800}
                          stroke="hsl(var(--card))"
                          strokeWidth={2.5}
                        >
                          {categoryBreakdown.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "12px", boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.4)" }}
                          labelStyle={{ color: "var(--color-foreground)", fontWeight: "bold", marginBottom: "4px" }}
                          itemStyle={{ color: "var(--color-foreground)" }}
                          formatter={(value: number) => formatCurrency(value, user?.currency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Spent</span>
                      <span className="text-sm md:text-lg font-extrabold text-foreground mt-0.5">
                        {formatCurrency(categoryBreakdown.reduce((sum, item) => sum + item.total, 0), user?.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Category breakdown list */}
                  <div className="space-y-2 w-full md:h-full md:overflow-y-auto md:pr-1 md:min-h-0">
                    {categoryBreakdown.map((cat) => {
                      const totalSpending = categoryBreakdown.reduce((sum, item) => sum + item.total, 0);
                      const percentage = ((cat.total / totalSpending) * 100).toFixed(1);
                      return (
                        <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-[10px] border border-border/60 hover:bg-muted/40 transition-colors text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}18` }}>
                              <TrendingDown className="h-3.5 w-3.5" style={{ color: cat.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs truncate">{cat.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{cat.count} txns ({percentage}%)</p>
                            </div>
                          </div>
                          <span className="font-bold text-xs shrink-0 ml-2">{formatCurrency(cat.total, user?.currency)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] md:h-full text-muted-foreground text-sm">
                  <PieChartIcon className="h-8 w-8 mb-2 opacity-30" />
                  <p>No spending data for {getMonthName(month)} {year}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
