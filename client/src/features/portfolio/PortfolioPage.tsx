import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HoldingsTab from "./components/HoldingsTab";
import MarketSearchTab from "./components/MarketSearchTab";
import WatchlistTab from "./components/WatchlistTab";
import IposTab from "./components/IposTab";

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState("holdings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Stock Market & Portfolio</h1>
        <p className="text-muted-foreground mt-1">Track your investments, watch live markets, and discover IPOs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-8">
          <TabsTrigger value="holdings">My Portfolio</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="ipos">IPOs</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
