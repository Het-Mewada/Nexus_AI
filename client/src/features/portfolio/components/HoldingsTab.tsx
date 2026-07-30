import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, PieChart, LineChart, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { investmentApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { Investment } from "@/types";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import StockDetailModal from "./StockDetailModal";
import type { MarketQuote } from "@/types";

export default function HoldingsTab() {
  const queryClient = useQueryClient();
  const [selectedStock, setSelectedStock] = useState<{ quote: MarketQuote, action: "BUY" | "SELL" } | null>(null);

  const { data: invResponse, isLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: investmentApi.getPortfolio,
  });

  const investments: Investment[] = Array.isArray(invResponse?.data?.investments) 
    ? invResponse.data.investments 
    : (Array.isArray(invResponse?.data) ? invResponse.data : []);

  const totalInvested = invResponse?.data?.totalInvested || investments.reduce((acc, inv) => acc + Number(inv.investedAmount), 0);
  const totalCurrentValue = invResponse?.data?.currentValue || investments.reduce((acc, inv) => {
    if (inv.quantity && inv.currentPrice) return acc + (Number(inv.quantity) * Number(inv.currentPrice));
    if (inv.currentPrice) return acc + Number(inv.currentPrice);
    return acc + Number(inv.investedAmount);
  }, 0);

  const returns = totalCurrentValue - totalInvested;
  const returnsPercent = totalInvested > 0 ? (returns / totalInvested) * 100 : 0;
  const isPositive = returns >= 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => investmentApi.deleteInvestment(id),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["investments"] }); 
      toast.success("Investment deleted"); 
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-none shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <PieChart className="h-24 w-24" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-white/70 font-medium text-sm uppercase tracking-wider">Total Portfolio Value</p>
            <h2 className="text-3xl font-bold mt-1">{formatCurrency(totalCurrentValue)}</h2>
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{isPositive ? '+' : ''}{formatCurrency(returns)} ({returnsPercent.toFixed(2)}%)</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm uppercase tracking-wider"><PieChart className="h-4 w-4"/> Invested Amount</p>
            <h2 className="text-2xl font-bold mt-1">{formatCurrency(totalInvested)}</h2>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm uppercase tracking-wider"><LineChart className="h-4 w-4"/> Active Assets</p>
            <h2 className="text-2xl font-bold mt-1">{investments.length}</h2>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card className="animate-pulse h-64 bg-muted border-none" />
      ) : investments.length === 0 ? (
        <Card className="border-dashed shadow-none bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
               <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">No investments yet</h3>
            <p className="text-muted-foreground text-sm mt-2 text-center max-w-sm">Go to the Market tab to search and simulate buying stocks to build your portfolio.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {investments.map((inv) => {
            const currentValue = (inv.quantity && inv.currentPrice) ? Number(inv.quantity) * Number(inv.currentPrice) : (Number(inv.currentPrice) || Number(inv.investedAmount));
            const diff = currentValue - Number(inv.investedAmount);
            const diffPercent = (diff / Number(inv.investedAmount)) * 100;
            const positive = diff >= 0;

            return (
              <Card key={inv.id} className="hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3 border-b bg-muted/10">
                  <div className="flex justify-between items-start">
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate" title={inv.name}>{inv.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {inv.symbol && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-sm font-mono font-medium">{inv.symbol}</span>}
                        <CardDescription className="text-xs">{inv.type}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-0 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Live Value</p>
                    <p className="text-lg font-bold">{formatCurrency(currentValue)}</p>
                    <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${positive ? 'text-emerald-500' : 'text-destructive'}`}>
                      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {positive ? '+' : ''}{diffPercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Invested</p>
                    <p className="font-semibold text-sm">{formatCurrency(Number(inv.investedAmount))}</p>
                    {inv.quantity && inv.currentPrice && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {inv.quantity} @ {formatCurrency(Number(inv.investedAmount)/Number(inv.quantity))} avg
                      </p>
                    )}
                  </div>
                </CardContent>
                <div className="p-4 pt-4 mt-2 border-t flex gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setSelectedStock({ 
                      quote: { symbol: inv.symbol!, shortName: inv.name, regularMarketPrice: inv.currentPrice ? Number(inv.currentPrice) : undefined } as MarketQuote, 
                      action: "BUY" 
                    })}
                  >
                    Buy More
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => setSelectedStock({ 
                      quote: { symbol: inv.symbol!, shortName: inv.name, regularMarketPrice: inv.currentPrice ? Number(inv.currentPrice) : undefined } as MarketQuote, 
                      action: "SELL" 
                    })}
                  >
                    Sell
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      
      {selectedStock && (
        <StockDetailModal 
          isOpen={!!selectedStock} 
          onClose={() => setSelectedStock(null)} 
          stock={selectedStock.quote} 
          defaultAction={selectedStock.action}
        />
      )}
    </div>
  );
}
