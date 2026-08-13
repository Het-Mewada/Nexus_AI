import { AlertTriangle } from "lucide-react";
import { useBalanceCheck } from "@/hooks/useBalanceCheck";
import { formatCurrency, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export function BalanceWarningCallout({ amount }: { amount: number | string }) {
  const { user } = useAuth();
  const currencySymbol = currencies.find(c => c.value === user?.currency)?.symbol || "₹";
  const { currentBalance, amount: numAmount, isNegative, isHighOutflow, remainingAfter, percentOfBalance } = useBalanceCheck(amount);

  if (!numAmount || numAmount <= 0) return null;
  if (!isNegative && !isHighOutflow) return null;

  const formattedCurrent = `${currencySymbol}${Math.abs(currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const formattedAmount = `${currencySymbol}${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const formattedRemaining = `${currencySymbol}${Math.abs(remainingAfter).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (isNegative) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-700 dark:text-amber-300">Balance Warning</p>
          <p className="text-muted-foreground/90 leading-normal">
            Your current available net balance is <span className="font-mono font-medium">{formattedCurrent}</span>. This transaction of <span className="font-mono font-medium">{formattedAmount}</span> exceeds your available balance. Your balance will become <span className="font-mono font-bold text-amber-600 dark:text-amber-400">-{formattedRemaining}</span>.
          </p>
        </div>
      </div>
    );
  }

  if (isHighOutflow) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-700 dark:text-amber-300">High Outflow Alert (80%+ of balance)</p>
          <p className="text-muted-foreground/90 leading-normal">
            This transaction consumes <span className="font-mono font-bold">{percentOfBalance}%</span> of your available balance. You will have <span className="font-mono font-medium">{formattedRemaining}</span> remaining.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
