import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { marketApi } from "@/services/api";
import type { Watchlist, MarketQuote } from "@/types";
import StockDetailModal from "./StockDetailModal";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

export default function WatchlistTab() {
  const queryClient = useQueryClient();
  const [selectedStock, setSelectedStock] = useState<MarketQuote | null>(null);

  const { data: watchlistData, isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: marketApi.getWatchlist,
  });
  
  const watchlist: Watchlist[] = watchlistData?.data || [];

  const removeMutation = useMutation({
    mutationFn: (symbol: string) => marketApi.removeFromWatchlist(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success("Removed from watchlist");
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isLoading ? (
        <Card className="animate-pulse h-64 bg-muted border-none" />
      ) : watchlist.length === 0 ? (
        <Card className="border-dashed shadow-none bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Star className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold">Your watchlist is empty</h3>
            <p className="text-muted-foreground text-sm mt-2">Go to the Market tab to search and add stocks to your watchlist.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map((item) => (
            <WatchlistItem 
              key={item.id} 
              item={item} 
              onRemove={() => removeMutation.mutate(item.symbol)}
              onClick={(quote) => setSelectedStock(quote)}
            />
          ))}
        </div>
      )}

      {selectedStock && (
        <StockDetailModal 
          isOpen={!!selectedStock}
          onClose={() => setSelectedStock(null)}
          stock={selectedStock}
        />
      )}
    </div>
  );
}

function WatchlistItem({ item, onRemove, onClick }: { item: Watchlist, onRemove: () => void, onClick: (q: MarketQuote) => void }) {
  // Fetch live quote for this specific item
  const { data: quoteRes } = useQuery({
    queryKey: ["marketQuote", item.symbol],
    queryFn: () => marketApi.getQuote(item.symbol),
    refetchInterval: 60000, // refresh every minute
  });

  const quote = quoteRes?.data;
  const currentPrice = quote?.regularMarketPrice || 0;
  const change = quote?.regularMarketChange || 0;
  const changePercent = quote?.regularMarketChangePercent || 0;
  const isPositive = change >= 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden"
      onClick={() => onClick(quote || { symbol: item.symbol, shortName: item.name })}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
             <div className="bg-yellow-500/10 p-2 rounded-xl text-yellow-600">
               <Star className="h-5 w-5 fill-current" />
             </div>
             <div>
               <h4 className="font-bold text-lg leading-tight">{item.symbol}</h4>
               <p className="text-sm text-muted-foreground line-clamp-1">{item.name || quote?.shortName}</p>
             </div>
          </div>
          <ConfirmDeleteDialog title="Remove from Watchlist" description="Are you sure you want to remove this stock from your watchlist?" onConfirm={onRemove}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1" onClick={(e) => e.stopPropagation()}>
               <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmDeleteDialog>
        </div>
        
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{currentPrice ? formatCurrency(currentPrice) : '---'}</p>
          </div>
          {currentPrice > 0 && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
