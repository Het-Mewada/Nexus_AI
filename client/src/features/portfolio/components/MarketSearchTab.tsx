import { useState } from "react";
import { Search, Star, Activity, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { marketApi } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MarketQuote } from "@/types";
import StockDetailModal from "./StockDetailModal";
import { toast } from "sonner";

export default function MarketSearchTab() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<MarketQuote | null>(null);

  // Debounce search manually for simplicity
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query);
  };

  const { data: searchResults, isLoading, isError } = useQuery({
    queryKey: ["marketSearch", debouncedQuery],
    queryFn: () => marketApi.searchStock(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const { data: watchlistData } = useQuery({
    queryKey: ["watchlist"],
    queryFn: marketApi.getWatchlist,
  });
  
  const watchlist = watchlistData?.data || [];
  const isWatchlisted = (symbol: string) => watchlist.some((w) => w.symbol === symbol);

  const toggleWatchlistMutation = useMutation({
    mutationFn: async ({ symbol, name, add }: { symbol: string, name?: string, add: boolean }) => {
      if (add) return marketApi.addToWatchlist(symbol, name);
      return marketApi.removeFromWatchlist(symbol);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success(variables.add ? "Added to watchlist" : "Removed from watchlist");
    }
  });

  const handleToggleWatchlist = (e: React.MouseEvent, quote: MarketQuote) => {
    e.stopPropagation();
    const add = !isWatchlisted(quote.symbol);
    toggleWatchlistMutation.mutate({ symbol: quote.symbol, name: quote.shortName, add });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-sm bg-muted/30">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search stocks by name or ticker (e.g. RELIANCE, AAPL, TCS)" 
                className="pl-10 py-6 text-lg rounded-xl border-primary/20 focus-visible:ring-primary/30"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="rounded-xl px-8 h-[50px] font-semibold">Search</Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Activity className="h-8 w-8 animate-pulse mb-4 text-primary" />
          <p>Searching live markets...</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>Failed to fetch market data. Try again later.</p>
        </div>
      )}

      {searchResults?.data && searchResults.data.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No stocks found for "{debouncedQuery}"</p>
        </div>
      )}

      {searchResults?.data && searchResults.data.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold px-1 text-sm text-muted-foreground uppercase tracking-wider">Search Results</h3>
          {searchResults.data.map((quote: MarketQuote) => {
            // Yahoo search doesn't always return live price, just basic metadata.
            // But we can show it so the user can click to see details.
            const isFav = isWatchlisted(quote.symbol);
            return (
              <Card 
                key={quote.symbol} 
                className="cursor-pointer hover:border-primary/50 transition-colors group overflow-hidden"
                onClick={() => setSelectedStock(quote)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`rounded-full hover:bg-yellow-500/10 ${isFav ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={(e) => handleToggleWatchlist(e, quote)}
                    >
                      <Star className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
                    </Button>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {quote.symbol}
                        <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded-sm">{quote.marketState || 'EQUITY'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{quote.shortName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Button variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      View details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
