import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, Tag, IndianRupee, Building2, Info } from "lucide-react";
import type { IpoItem } from "@/types";

export default function IpoDetailModal({ 
  isOpen, 
  onClose, 
  ipo 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  ipo: IpoItem | null;
}) {
  if (!ipo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="mb-2">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold leading-tight">{ipo.name}</DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase bg-muted px-2 py-0.5 rounded-full">
                  {ipo.status} IPO
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/20">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" /> Issue Dates
              </div>
              <div className="font-semibold text-foreground">{ipo.date}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Tag className="h-4 w-4" /> Issue Size
              </div>
              <div className="font-semibold text-foreground">{ipo.size}</div>
            </div>
            <div className="col-span-2 space-y-1 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <IndianRupee className="h-4 w-4" /> Price Band / GMP
              </div>
              <div className="font-bold text-lg text-primary">{ipo.price.includes('₹') ? ipo.price : `₹${ipo.price}`}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4" /> Resources & Links
            </h4>
            <div className="flex flex-col gap-2">
              {ipo.links?.map((link, i) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  className="w-full justify-between hover:bg-muted/50 transition-colors h-auto py-3 px-4 border-dashed hover:border-solid hover:border-primary/50"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <span className="font-medium text-sm">{link.title}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
              {(!ipo.links || ipo.links.length === 0) && (
                <div className="text-sm text-muted-foreground italic text-center p-4 bg-muted/10 rounded-lg border border-dashed">
                  No direct links available.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
