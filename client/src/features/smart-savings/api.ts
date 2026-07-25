import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface SmartSaving {
  id: string;
  categoryId: string;
  actualPurchaseWanted: string;
  expectedCost: string | number;
  actualPurchase: string;
  actualCost: string | number;
  moneySaved: string | number;
  decisionReason: string;
  description?: string;
  mood?: string;
  difficulty?: string;
  wouldBuyLater?: string;
  photoUrl?: string;
  createdAt: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

export function useSmartSavings(filters?: any) {
  return useQuery({
    queryKey: ["smart-savings", filters],
    queryFn: async () => {
      const { data } = await api.get("/smart-savings", { params: filters });
      return data.data as SmartSaving[];
    },
  });
}

export function useSmartSavingsAnalytics() {
  return useQuery({
    queryKey: ["smart-savings-analytics"],
    queryFn: async () => {
      const { data } = await api.get("/smart-savings/analytics/dashboard");
      return data.data;
    },
  });
}

export function useSmartSavingsInsights() {
  return useQuery({
    queryKey: ["smart-savings-insights"],
    queryFn: async () => {
      const { data } = await api.get("/smart-savings/analytics/insights");
      return data.data as string[];
    },
  });
}

export function useSmartSavingsAchievements() {
  return useQuery({
    queryKey: ["smart-savings-achievements"],
    queryFn: async () => {
      const { data } = await api.get("/smart-savings/achievements");
      return data.data;
    },
  });
}

export function useAddSmartSaving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saving: Partial<SmartSaving>) => {
      const { data } = await api.post("/smart-savings", saving);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-savings"] });
      queryClient.invalidateQueries({ queryKey: ["smart-savings-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["smart-savings-achievements"] });
    },
  });
}
