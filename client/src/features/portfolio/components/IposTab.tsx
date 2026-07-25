import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertCircle, Building2, Calendar, IndianRupee, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { marketApi } from "@/services/api";
import type { IpoItem } from "@/types";
import IpoDetailModal from "./IpoDetailModal";

export default function IposTab() {
  const [selectedIpo, setSelectedIpo] = useState<IpoItem | null>(null);
  
  const { data: ipoRes, isLoading, isError } = useQuery({
    queryKey: ["ipos"],
    queryFn: marketApi.getIpos,
  });

  const ipos: IpoItem[] = ipoRes?.data || [];

  const upcoming = ipos.filter(i => i.status === 'Upcoming');
  const live = ipos.filter(i => i.status === 'Live');
  const closed = ipos.filter(i => i.status === 'Closed');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
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
          <IpoSection title="Live IPOs" ipos={live} color="emerald" emptyText="No live IPOs at the moment." onIpoClick={setSelectedIpo} />
          <IpoSection title="Upcoming IPOs" ipos={upcoming} color="blue" emptyText="No upcoming IPOs announced." onIpoClick={setSelectedIpo} />
          <IpoSection title="Recently Closed IPOs" ipos={closed} color="slate" emptyText="No recent closed IPOs." onIpoClick={setSelectedIpo} />
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
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => onIpoClick && onIpoClick(ipo)}
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-lg leading-tight line-clamp-1" title={ipo.name}>{ipo.name}</h4>
                  <div className={`text-xs font-semibold uppercase mt-1 ${colorClasses[color]?.split(' ')[1] || ''}`}>
                    {ipo.status}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
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
                    <IndianRupee className="h-3.5 w-3.5" /> Price Band
                  </div>
                  <div className="font-semibold text-base">₹{ipo.price}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
