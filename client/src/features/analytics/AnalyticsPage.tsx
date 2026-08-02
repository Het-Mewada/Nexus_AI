import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";
import { Download, PieChart as PieChartIcon, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { analyticsApi, exportApi } from "@/services/api";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { toast } from "sonner";
import type { ChartData, CashFlowData, CategoryBreakdownItem } from "@/types";

export default function AnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportApi.csv();
      toast.success("Export downloaded successfully");
    } catch (err) {
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your financial data</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" /> {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
              ) : charts?.monthlyComparison && charts.monthlyComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.monthlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">No data for {year}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cash Flow Line Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5 text-primary" /> Net Cash Flow & Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
              ) : cashFlow?.cashFlow && cashFlow.cashFlow.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlow.cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="net" name="Net Cash Flow" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="runningBalance" name="Running Balance" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">No data for {year}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-primary" /> Spending by Category</CardTitle>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                {months.map((m) => <SelectItem key={m} value={String(m)}>{getMonthName(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
            ) : categoryBreakdown && categoryBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={90} outerRadius={140} paddingAngle={2} dataKey="total" nameKey="name" animationDuration={1000}>
                      {categoryBreakdown.map((entry) => <Cell key={entry.id} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-4">
                  {categoryBreakdown.map((cat) => {
                    const totalSpending = categoryBreakdown.reduce((sum, item) => sum + item.total, 0);
                    const percentage = ((cat.total / totalSpending) * 100).toFixed(1);
                    return (
                      <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}15` }}>
                            <TrendingDown className="h-4 w-4" style={{ color: cat.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">{cat.count} transactions ({percentage}%)</p>
                          </div>
                        </div>
                        <span className="font-bold">{formatCurrency(cat.total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <PieChartIcon className="h-12 w-12 mb-3 opacity-30" />
                <p>No spending data for {getMonthName(month)} {year}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
