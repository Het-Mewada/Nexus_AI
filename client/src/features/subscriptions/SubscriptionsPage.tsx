import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Repeat, ExternalLink, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { subscriptionApi } from "@/services/api";
import { formatCurrency, formatDate, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Subscription } from "@/types";

const subSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  nextBillingDate: z.string().min(1, "Next billing date is required"),
  status: z.enum(["ACTIVE", "CANCELLED"]),
  url: z.string().optional(),
});

type SubForm = z.infer<typeof subSchema>;

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  
  const currencySymbol = currencies.find(c => c.value === user?.currency)?.symbol || "₹";

  const { data: subsResponse, isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: subscriptionApi.list,
  });

  const subs = (subsResponse?.data || []) as Subscription[];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SubForm>({
    resolver: zodResolver(subSchema),
    defaultValues: { billingCycle: "MONTHLY", status: "ACTIVE" },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Subscription>) => subscriptionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscription added");
      handleClose();
    },
    onError: () => toast.error("Failed to add subscription"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subscription> }) => subscriptionApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscription updated");
      handleClose();
    },
    onError: () => toast.error("Failed to update subscription"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subscriptionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscription deleted");
    },
    onError: () => toast.error("Failed to delete subscription"),
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    reset({ name: "", amount: 0, billingCycle: "MONTHLY", nextBillingDate: "", status: "ACTIVE", url: "" });
  };

  const handleEdit = (sub: Subscription) => {
    setEditing(sub);
    setValue("name", sub.name);
    setValue("amount", Number(sub.amount));
    setValue("billingCycle", sub.billingCycle);
    setValue("nextBillingDate", sub.nextBillingDate.substring(0, 10));
    setValue("status", sub.status);
    setValue("url", sub.url || "");
    setIsOpen(true);
  };

  const onSubmit = (formData: SubForm) => {
    const payload = { 
      ...formData, 
      nextBillingDate: new Date(formData.nextBillingDate).toISOString()
    };
    
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const activeCount = subs.filter(s => s.status === "ACTIVE").length;
  const monthlyTotal = subs.filter(s => s.status === "ACTIVE").reduce((acc, sub) => acc + (sub.billingCycle === "YEARLY" ? Number(sub.amount)/12 : Number(sub.amount)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage your recurring payments</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient">
          <Plus className="h-4 w-4" /> Add Subscription
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-primary-foreground">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-indigo-100 font-medium">Monthly Cost</p>
              <h2 className="text-3xl font-bold mt-1">{formatCurrency(monthlyTotal)}</h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground font-medium">Active Subscriptions</p>
              <h2 className="text-3xl font-bold mt-1">{activeCount}</h2>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Repeat className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse h-32 bg-muted" />
          ))}
        </div>
      ) : subs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Repeat className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No subscriptions found</h3>
            <p className="text-muted-foreground text-sm mt-1">Add your Netflix, Spotify, or Gym membership</p>
            <Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-4"><Plus className="h-4 w-4" /> Add Subscription</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subs.map((sub, i) => (
            <motion.div key={sub.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className={`hover:shadow-md transition-shadow h-full flex flex-col ${sub.status === 'CANCELLED' ? 'opacity-60 bg-muted/50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{sub.name}</CardTitle>
                      {sub.status === 'CANCELLED' && <Badge variant="secondary" className="text-xs">Cancelled</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(sub)}><Edit className="h-4 w-4" /></Button>
                      <ConfirmDeleteDialog title="Delete Subscription" onConfirm={() => deleteMutation.mutate(sub.id)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </ConfirmDeleteDialog>
                    </div>
                  </div>
                  {sub.url && (
                    <a href={sub.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center hover:underline">
                      {new URL(sub.url).hostname} <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end pt-4">
                  <div className="flex items-end justify-between mb-2">
                    <div className="text-2xl font-bold">
                      {formatCurrency(Number(sub.amount))}
                      <span className="text-sm font-normal text-muted-foreground">/{sub.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
                    </div>
                  </div>
                  {sub.status === 'ACTIVE' && (
                    <div className="text-xs text-muted-foreground flex items-center justify-between border-t pt-2 mt-2">
                      <span>Next charge:</span>
                      <span className="font-medium">{formatDate(sub.nextBillingDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
            <DialogDescription>{editing ? "Update your subscription details" : "Track a new recurring service"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input placeholder="e.g. Netflix, Gym, Spotify" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ({currencySymbol})</Label>
                <Input type="number" step="0.01" {...register("amount")} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                {!errors.amount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={watch("billingCycle")} onValueChange={(v: any) => setValue("billingCycle", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Next Billing Date</Label>
                <Input type="date" {...register("nextBillingDate")} />
                {errors.nextBillingDate && <p className="text-xs text-destructive">{errors.nextBillingDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v: any) => setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service URL (Optional)</Label>
              <Input type="url" placeholder="https://..." {...register("url")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Add"} Subscription
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
