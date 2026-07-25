import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { coachApi } from "@/services/api";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function CoachPage() {
  const { user } = useAuth();

  const { data: weeklyReview } = useQuery({
    queryKey: ["coach", "weekly-review"],
    queryFn: coachApi.getWeeklyReview,
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-8">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">AI Wealth Coach</h1>
        <p className="text-muted-foreground mt-1">Your personalized guide to financial freedom.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        {/* Weekly Review */}
        <motion.div variants={item}>
          <Card className="p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg">Weekly Review</h3>
              </div>
              {weeklyReview && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Week Score</div>
                  <div className="text-2xl font-bold text-blue-500">{weeklyReview.weekScore}/100</div>
                </div>
              )}
            </div>

            {weeklyReview ? (
              <div className="space-y-6">
                <p className="text-muted-foreground">{weeklyReview.summary}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted p-4 rounded-xl">
                    <div className="text-xs text-muted-foreground mb-1">Spent</div>
                    <div className="font-semibold">{formatCurrency(weeklyReview.weekSpent, user?.currency)}</div>
                  </div>
                  <div className="bg-muted p-4 rounded-xl">
                    <div className="text-xs text-muted-foreground mb-1">Income</div>
                    <div className="font-semibold">{formatCurrency(weeklyReview.weekIncome, user?.currency)}</div>
                  </div>
                  <div className="bg-muted p-4 rounded-xl">
                    <div className="text-xs text-muted-foreground mb-1">Savings Rate</div>
                    <div className="font-semibold">{weeklyReview.savingsRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-muted p-4 rounded-xl">
                    <div className="text-xs text-muted-foreground mb-1">Top Expense</div>
                    <div className="font-semibold truncate">{weeklyReview.topCategory}</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <h4 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1"><TrendingUp className="h-4 w-4"/> Strengths</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      {weeklyReview.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-amber-500 mb-2 flex items-center gap-1"><Target className="h-4 w-4"/> Focus Areas</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      {weeklyReview.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">Generating your weekly review...</div>
            )}
          </Card>
        </motion.div>
      </div>

    </motion.div>
  );
}
