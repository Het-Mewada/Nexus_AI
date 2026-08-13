import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/services/api";

export function useBalanceCheck(amountInput?: number | string) {
  const { data: response } = useQuery({
    queryKey: ["dashboard"],
    queryFn: analyticsApi.getDashboard,
  });

  const summary = response?.data;
  const currentBalance = summary?.currentBalance ?? 0;
  const amount = typeof amountInput === "string" ? parseFloat(amountInput) || 0 : Number(amountInput || 0);

  const isPositiveBalance = currentBalance > 0;
  const isNegative = amount > currentBalance;
  const isHighOutflow = amount > 0 && currentBalance > 0 && (amount / currentBalance) >= 0.8 && amount <= currentBalance;
  const remainingAfter = currentBalance - amount;
  const percentOfBalance = currentBalance > 0 ? Math.round((amount / currentBalance) * 100) : 100;

  return {
    currentBalance,
    amount,
    isNegative,
    isHighOutflow,
    remainingAfter,
    percentOfBalance,
    isPositiveBalance,
  };
}
