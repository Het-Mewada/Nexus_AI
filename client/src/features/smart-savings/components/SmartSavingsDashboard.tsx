import { motion } from "framer-motion";
import { PiggyBank, Flame, Target, TrendingUp, Calendar, Zap, RefreshCcw } from "lucide-react";
import { useSmartSavingsAnalytics } from "../api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function SmartSavingsDashboard() {
  const { data: analytics, isLoading, refetch, isRefetching } = useSmartSavingsAnalytics();
  const { user } = useAuth();
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("en-IN", { style: "currency", currency: user?.currency || "INR", maximumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-32 bg-card rounded-xl"></div>
      <div className="h-64 bg-card rounded-xl"></div>
    </div>;
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Discipline Overview</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Saved */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Avoided Spend</h3>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(analytics.overview.totalSaved)}</p>
          <p className="text-xs text-muted-foreground mt-2">Across {analytics.overview.totalDecisions} smart decisions</p>
        </motion.div>

        {/* Current Streak */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Current Streak</h3>
            <div className="p-2 bg-warning/10 rounded-lg text-warning">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{analytics.overview.currentStreak} Days</p>
          <p className="text-xs text-muted-foreground mt-2">Longest streak: {analytics.overview.longestStreak} days</p>
        </motion.div>

        {/* Avg per decision */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Avg per Decision</h3>
            <div className="p-2 bg-secondary rounded-lg text-secondary-foreground">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(analytics.overview.averagePerDecision)}</p>
          <p className="text-xs text-muted-foreground mt-2">Value of your self-control</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Opportunity Growth Projections */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Opportunity Growth</h3>
              <p className="text-sm text-muted-foreground">If you invest this monthly average at 8% p.a.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
              <span className="text-muted-foreground font-medium">1 Year Projection</span>
              <span className="text-lg font-bold">{formatCurrency(analytics.projections.projected1Year)}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/5"></div>
              <span className="text-muted-foreground font-medium relative z-10">5 Year Projection</span>
              <span className="text-xl font-bold text-primary relative z-10">{formatCurrency(analytics.projections.projected5Year)}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-primary-foreground font-medium">10 Year Projection</span>
              <span className="text-2xl font-black text-primary-foreground">{formatCurrency(analytics.projections.projected10Year)}</span>
            </div>
          </div>
        </motion.div>

        {/* Recent Decisions */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-success/10 rounded-lg text-success">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">Recent Smart Decisions</h3>
          </div>

          {analytics.recentSavings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No smart savings logged yet.</p>
              <p className="text-sm mt-1">Start tracking your victories today!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.recentSavings.map((saving: any) => (
                <div key={saving.id} className="flex items-start justify-between p-3 rounded-lg hover:bg-background border border-transparent hover:border-border transition-colors">
                  <div>
                    <p className="font-medium">{saving.actualPurchaseWanted}</p>
                    <p className="text-sm text-muted-foreground line-through">₹{Number(saving.expectedCost)}</p>
                    <p className="text-sm text-muted-foreground mt-1">➔ Did: {saving.actualPurchase} (₹{Number(saving.actualCost)})</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-success/10 text-success rounded text-xs font-semibold">
                      +{formatCurrency(Number(saving.moneySaved))}
                    </span>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(saving.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
