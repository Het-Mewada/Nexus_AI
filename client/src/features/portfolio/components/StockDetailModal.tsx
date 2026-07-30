import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { marketApi, investmentApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MarketQuote } from "@/types";

export default function StockDetailModal({
  isOpen,
  onClose,
  stock,
  defaultAction
}: {
  isOpen: boolean;
  onClose: () => void;
  stock: MarketQuote;
  defaultAction?: "BUY" | "SELL";
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(defaultAction ? "trade" : "chart");
  const [quantity, setQuantity] = useState("1");
  const [timeRange, setTimeRange] = useState("1y");
  const [tradeAction, setTradeAction] = useState<"BUY" | "SELL">(defaultAction || "BUY");
  const [executionPrice, setExecutionPrice] = useState("");

  const { data: invResponse } = useQuery({
    queryKey: ["investments"],
    queryFn: investmentApi.getPortfolio,
    enabled: isOpen,
  });

  const investmentsArray = Array.isArray(invResponse?.data?.investments)
    ? invResponse?.data?.investments
    : (Array.isArray(invResponse?.data) ? invResponse?.data : []);
  const ownedInvestment = investmentsArray.find((i: any) => i.symbol === stock.symbol);
  const ownedQuantity = ownedInvestment ? Number(ownedInvestment.quantity) : 0;

  const { data: quoteRes, isLoading: quoteLoading } = useQuery({
    queryKey: ["marketQuote", stock.symbol],
    queryFn: () => marketApi.getQuote(stock.symbol),
    enabled: isOpen,
  });

  const quote = quoteRes?.data || stock;
  const currentPrice = quote.regularMarketPrice || 0;
  const change = quote.regularMarketChange || 0;
  const changePercent = quote.regularMarketChangePercent || 0;
  const isPositive = change >= 0;

  useEffect(() => {
    if (currentPrice && !executionPrice) {
      setExecutionPrice(currentPrice.toString());
    }
  }, [currentPrice, executionPrice]);

  const { data: chartRes, isLoading: chartLoading } = useQuery({
    queryKey: ["marketChart", stock.symbol, timeRange],
    queryFn: () => marketApi.getChart(stock.symbol, timeRange === '1d' ? '5m' : '1d', timeRange),
    enabled: isOpen && activeTab === "chart",
  });

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    if (timeRange === '1d') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeRange === '5d') {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else if (timeRange === '1mo' || timeRange === '6mo') {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return d.toLocaleDateString([], { month: 'short', year: 'numeric' });
    }
  };

  const chartData = chartRes?.data?.quotes?.map((q: any, i: number) => ({
    time: formatTime(chartRes.data.timestamp[i]),
    price: q.close
  })).filter((d: any) => d.price !== null) || [];

  const buyMutation = useMutation({
    mutationFn: () => investmentApi.addInvestment({
      type: "STOCK",
      name: quote.shortName || quote.symbol,
      symbol: quote.symbol,
      quantity: Number(quantity),
      averagePrice: Number(executionPrice) || currentPrice,
      investedAmount: Number(quantity) * (Number(executionPrice) || currentPrice),
      currentPrice: currentPrice,
      currency: "INR",
    } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["investmentTransactions"] });
      toast.success(`Successfully bought ${quantity} shares of ${quote.symbol}`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || error.message || "Failed to buy shares");
    }
  });

  const sellMutation = useMutation({
    mutationFn: () => investmentApi.sellInvestment({
      symbol: quote.symbol,
      quantity: Number(quantity),
      currentPrice: currentPrice,
      executionPrice: Number(executionPrice) || currentPrice,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["investmentTransactions"] });
      toast.success(`Successfully sold ${quantity} shares of ${quote.symbol}`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || error.message || "Failed to sell shares");
    }
  });

  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) return toast.error("Invalid quantity");

    if (tradeAction === "BUY") {
      buyMutation.mutate();
    } else {
      sellMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start pr-6">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {quote.symbol}
                <span className="text-xs font-normal bg-muted px-2 py-1 rounded-sm text-muted-foreground">{quote.marketState || 'EQUITY'}</span>
              </DialogTitle>
              <DialogDescription className="text-base mt-1">{quote.shortName}</DialogDescription>
            </div>
            <div className="text-right">
              {quoteLoading ? (
                <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{formatCurrency(currentPrice)}</div>
                  <div className={`flex items-center justify-end gap-1 font-medium ${isPositive ? 'text-emerald-500' : 'text-destructive'}`}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {isPositive ? '+' : ''}{formatCurrency(change)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Interactive Chart</TabsTrigger>
            <TabsTrigger value="trade">Trade (Simulated)</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="pt-4 space-y-4">
            <div className="flex gap-2 mb-2">
              {['1d', '5d', '1mo', '6mo', '1y', '5y'].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="h-7 text-xs"
                >
                  {range.toUpperCase()}
                </Button>
              ))}
            </div>

            <div className="h-[300px] w-full border rounded-xl bg-card p-4">
              {chartLoading ? (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <Activity className="h-8 w-8 animate-pulse text-primary" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-muted)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: 'var(--color-foreground)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--color-foreground)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                      formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Price']}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? '#10b981' : '#ef4444'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  No chart data available for this range.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="trade" className="pt-4">
            <form onSubmit={handleTrade} className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-xl border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Action</span>
                  <div className="flex bg-background rounded-lg border p-1">
                    <div
                      className={`px-4 py-1.5 rounded-md font-semibold text-sm cursor-pointer transition-colors ${tradeAction === "BUY" ? "bg-emerald-500/10 text-emerald-600" : "text-muted-foreground hover:bg-muted"}`}
                      onClick={() => setTradeAction("BUY")}
                    >BUY</div>
                    <div
                      className={`px-4 py-1.5 rounded-md font-semibold text-sm cursor-pointer transition-colors ${tradeAction === "SELL" ? "bg-rose-500/10 text-rose-600" : "text-muted-foreground hover:bg-muted"}`}
                      onClick={() => setTradeAction("SELL")}
                    >SELL</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="text-lg font-bold"
                    />
                    {tradeAction === "SELL" && ownedQuantity > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <Button type="button" variant="outline" disabled={ownedQuantity < 1} className="h-7 px-3 text-xs" onClick={() => setQuantity("1")}>1</Button>
                        <Button type="button" variant="outline" disabled={ownedQuantity < 5} className="h-7 px-3 text-xs" onClick={() => setQuantity("5")}>5</Button>
                        <Button type="button" variant="outline" disabled={ownedQuantity < 10} className="h-7 px-3 text-xs" onClick={() => setQuantity("10")}>10</Button>
                        <Button type="button" variant="outline" disabled={ownedQuantity < 2} className="h-7 px-3 text-xs" onClick={() => setQuantity(Math.floor(ownedQuantity / 2).toString())}>Half</Button>
                        <Button type="button" variant="outline" disabled={ownedQuantity < 1} className="h-7 px-3 text-xs" onClick={() => setQuantity(ownedQuantity.toString())}>Max</Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={executionPrice}
                      onChange={(e) => setExecutionPrice(e.target.value)}
                      className="text-lg font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground font-medium">Estimated Value</span>
                  <span className="text-xl font-bold">{formatCurrency((Number(quantity) || 0) * (Number(executionPrice) || currentPrice))}</span>
                </div>
              </div>

              <Button
                type="submit"
                className={`w-full h-12 text-lg font-bold text-white ${tradeAction === "BUY" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                disabled={buyMutation.isPending || sellMutation.isPending || !currentPrice}
              >
                {buyMutation.isPending || sellMutation.isPending ? "Executing..." : `${tradeAction === "BUY" ? 'Buy' : 'Sell'} ${quantity} Share${Number(quantity) > 1 ? 's' : ''}`}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
