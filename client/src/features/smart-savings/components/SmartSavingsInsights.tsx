import { useSmartSavingsInsights } from "../api";
import { Sparkles } from "lucide-react";

export function SmartSavingsInsights() {
  const { data: insights, isLoading } = useSmartSavingsInsights();

  if (isLoading) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 animate-pulse">
        <div className="flex gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20"></div>
          <div className="h-6 bg-primary/20 rounded w-48"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-primary/10 rounded w-full"></div>
          <div className="h-4 bg-primary/10 rounded w-5/6"></div>
          <div className="h-4 bg-primary/10 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
        <Sparkles className="w-48 h-48 text-primary" />
      </div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 bg-primary/20 rounded-full text-primary">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-primary">AI Behavioral Insights</h3>
      </div>
      
      <div className="space-y-4 relative z-10">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-background border border-primary/30 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-primary">
              {idx + 1}
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
