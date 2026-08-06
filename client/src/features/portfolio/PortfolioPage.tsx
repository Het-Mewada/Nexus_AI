import { useLocalStorage } from "@/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HoldingsTab from "./components/HoldingsTab";
import MarketSearchTab from "./components/MarketSearchTab";
import WatchlistTab from "./components/WatchlistTab";
import IposTab from "./components/IposTab";
import HistoryTab from "./components/HistoryTab";

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useLocalStorage("portfolioActiveTab", "holdings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Stock Market & Portfolio</h1>
        <p className="text-muted-foreground mt-1">Track your investments, watch live markets, and discover IPOs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex flex-wrap h-auto justify-start mb-8">
          <TabsTrigger value="holdings">My Portfolio</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="ipos">IPOs</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="holdings" className="mt-0">
          <HoldingsTab />
        </TabsContent>
        
        <TabsContent value="market" className="mt-0">
          <MarketSearchTab />
        </TabsContent>
        
        <TabsContent value="watchlist" className="mt-0">
          <WatchlistTab />
        </TabsContent>
        
        <TabsContent value="ipos" className="mt-0">
          <IposTab />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
