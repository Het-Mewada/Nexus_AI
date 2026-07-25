import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialAgentApi } from "@/services/api";
import { AlertCircle, TrendingUp, TrendingDown, Info, ShieldAlert, X, ChevronRight, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const iconMap = {
  INFO: Info,
  WARNING: AlertCircle,
  CRITICAL: ShieldAlert,
};

const colorMap = {
  INFO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  WARNING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function AgentInsights() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery({
    queryKey: ["agent-insights"],
    queryFn: financialAgentApi.getInsights,
  });

  const runAnalysisMutation = useMutation({
    mutationFn: financialAgentApi.runAnalysis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-insights"] });
      toast.success("Analysis complete");
    },
  });

  const dismissMutation = useMutation({
    mutationFn: financialAgentApi.dismissInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-insights"] });
    },
  });

  if (isLoading) return null;
  if (!insights || (insights as any[]).length === 0) return null;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          AI Financial Agent
        </h2>
        <button
          onClick={() => runAnalysisMutation.mutate()}
          disabled={runAnalysisMutation.isPending}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          {runAnalysisMutation.isPending ? "Analyzing..." : "Refresh Analysis"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(insights as any[]).map((insight: any) => {
          const Icon = iconMap[insight.severity as keyof typeof iconMap] || Info;
          return (
            <div
              key={insight.id}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md ${colorMap[insight.severity as keyof typeof colorMap]} bg-background`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${colorMap[insight.severity as keyof typeof colorMap].split(' ')[0]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{insight.title}</h3>
                </div>
                <button
                  onClick={() => dismissMutation.mutate(insight.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {insight.message}
              </p>
              
              {insight.data && insight.data.category && (
                <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Category: {insight.data.category}</span>
                  {insight.data.currentSpend && (
                    <span className="text-foreground">{formatCurrency(insight.data.currentSpend, user?.currency)}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
