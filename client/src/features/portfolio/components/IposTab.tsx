import { useState } from "react";
import { useLocalStorage } from "@/hooks";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Building2, Calendar, IndianRupee, Tag, CheckSquare, Square, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { marketApi } from "@/services/api";
import type { IpoItem } from "@/types";
import IpoDetailModal from "./IpoDetailModal";

export default function IposTab() {
  const [selectedIpo, setSelectedIpo] = useState<IpoItem | null>(null);
  
  const [showMainboard, setShowMainboard] = useLocalStorage("ipoShowMainboard", true);
  const [showSME, setShowSME] = useLocalStorage("ipoShowSME", true);
  const [activeTab, setActiveTab] = useLocalStorage("ipoActiveTab", "live");

  const { data: ipoRes, isLoading, isError } = useQuery({
    queryKey: ["ipos"],
    queryFn: marketApi.getIpos,
  });

  const allIpos: IpoItem[] = ipoRes?.data || [];

  const ipos = allIpos.filter(ipo => {
    const isSme = ipo.type?.toUpperCase().includes('SME');
    if (isSme) return showSME;
    return showMainboard; // Fallback treats unknown as Mainboard
  });

  const upcoming = ipos.filter(i => i.status === 'Upcoming');
  const live = ipos.filter(i => i.status === 'Live');
  const closed = ipos.filter(i => i.status === 'Closed');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Activity className="h-8 w-8 animate-pulse mb-4 text-primary" />
          <p>Fetching live IPO data...</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>Failed to fetch IPO data. Try again later.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col gap-4 mb-6">
              <TabsList className="inline-flex flex-wrap h-auto justify-start">
                <TabsTrigger value="live" className="text-sm font-semibold">Live</TabsTrigger>
                <TabsTrigger value="upcoming" className="text-sm font-semibold">Upcoming</TabsTrigger>
                <TabsTrigger value="closed" className="text-sm font-semibold">Recently Closed</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Filters:</span>
                <Button 
                  variant={showMainboard ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setShowMainboard(!showMainboard)}
                  className="h-8 rounded-full px-4"
                >
                  {showMainboard ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
                  Mainboard
                </Button>
                <Button 
                  variant={showSME ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setShowSME(!showSME)}
                  className="h-8 rounded-full px-4"
                >
                  {showSME ? <CheckSquare className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
                  SME
                </Button>
              </div>
            </div>

            <TabsContent value="live" className="mt-0">
              <IpoSection title="Live IPOs" ipos={live} color="emerald" emptyText="No live IPOs matching filters." onIpoClick={setSelectedIpo} />
            </TabsContent>
            <TabsContent value="upcoming" className="mt-0">
              <IpoSection title="Upcoming IPOs" ipos={upcoming} color="blue" emptyText="No upcoming IPOs matching filters." onIpoClick={setSelectedIpo} />
            </TabsContent>
            <TabsContent value="closed" className="mt-0">
              <IpoSection title="Recently Closed IPOs" ipos={closed} color="slate" emptyText="No recent closed IPOs matching filters." onIpoClick={setSelectedIpo} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <IpoDetailModal 
        isOpen={!!selectedIpo} 
        onClose={() => setSelectedIpo(null)} 
        ipo={selectedIpo} 
      />
    </div>
  );
}

function IpoSection({ title, ipos, color, emptyText, onIpoClick }: { title: string, ipos: IpoItem[], color: string, emptyText: string, onIpoClick?: (ipo: IpoItem) => void }) {
  if (ipos.length === 0) return (
    <div className="space-y-3">
      <h3 className="font-semibold px-1 text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
      <Card className="border-dashed shadow-none bg-muted/30">
        <CardContent className="p-6 text-center text-muted-foreground">
          {emptyText}
        </CardContent>
      </Card>
    </div>
  );

  const colorClasses: Record<string, string> = {
    'emerald': 'bg-emerald-500/10 text-emerald-600',
    'blue': 'bg-blue-500/10 text-blue-600',
    'slate': 'bg-slate-500/10 text-slate-600',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colorClasses[color]}`}>
          {ipos.length} {ipos.length === 1 ? 'IPO' : 'IPOs'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ipos.map(ipo => (
          <Card 
            key={ipo.id} 
            className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col"
            onClick={() => onIpoClick && onIpoClick(ipo)}
          >
            <CardContent className="p-5 flex flex-col flex-1">
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight line-clamp-1" title={ipo.name}>{ipo.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`text-xs font-semibold uppercase ${colorClasses[color]?.split(' ')[1] || ''}`}>
                      {ipo.status}
                    </div>
                    {ipo.type && (
                      <div className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase">
                        {ipo.type}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mt-auto">
                <div>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 text-xs">
                    <Calendar className="h-3.5 w-3.5" /> Dates
                  </div>
                  <div className="font-medium">{ipo.date}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 text-xs">
                    <Tag className="h-3.5 w-3.5" /> Issue Size
                  </div>
                  <div className="font-medium">{ipo.size}</div>
                </div>
                <div className="col-span-2 pt-2 border-t mt-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 text-xs">
                    <IndianRupee className="h-3.5 w-3.5" /> Price Band / GMP
                  </div>
                  <div className="font-semibold text-base">{ipo.price}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
