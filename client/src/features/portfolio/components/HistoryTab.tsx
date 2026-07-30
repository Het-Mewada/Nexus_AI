import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { investmentApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, History } from "lucide-react";

export default function HistoryTab() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["investmentTransactions"],
    queryFn: () => investmentApi.getTransactions(),
  });

  const transactions = res?.data || [];

  if (isLoading) {
    return <div className="h-64 flex justify-center items-center"><div className="animate-pulse flex flex-col items-center"><History className="h-10 w-10 text-muted-foreground mb-4" /><p className="text-muted-foreground">Loading history...</p></div></div>;
  }

  if (transactions.length === 0) {
    return (
      <Card className="border-dashed shadow-none bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
             <History className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold">No trading history</h3>
          <p className="text-muted-foreground text-sm mt-2 text-center max-w-sm">Your buy and sell orders will appear here automatically.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {transactions.map((tx: any) => (
        <Card key={tx.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tx.type === 'BUY' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {tx.type === 'BUY' ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
              </div>
              <div>
                <h4 className="font-bold">{tx.investment.symbol}</h4>
                <p className="text-xs text-muted-foreground">{tx.investment.name}</p>
                <div className="text-xs font-medium mt-1">
                  {new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${tx.type === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tx.type === 'BUY' ? '-' : '+'}{formatCurrency(tx.totalAmount)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {tx.type} {tx.quantity} @ {formatCurrency(tx.price)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
