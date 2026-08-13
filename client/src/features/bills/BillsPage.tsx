import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Calendar, CheckCircle2, Circle, AlertCircle, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { BalanceWarningCallout } from "@/components/ui/balance-warning-callout";
import { billApi, analyticsApi } from "@/services/api";
import { formatCurrency, formatDate, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Bill } from "@/types";

const billSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  isPaid: z.boolean().optional(),
  isRecurring: z.boolean().default(false),
  reminderDays: z.coerce.number().min(1).default(3),
  categoryId: z.string().optional().nullable(),
});

function generateBillHistory(bill: Bill) {
  if (!bill.isRecurring || !bill.createdAt) return null;

  const createdDate = new Date(bill.createdAt);
  const dueDate = new Date(bill.dueDate);

  const start = new Date(createdDate.getFullYear(), createdDate.getMonth(), 1);
  const end = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);

  const history = [];
  let current = new Date(start);

  while (current <= end) {
    const isPendingMonth = current.getTime() === end.getTime();
    history.push({
      label: current.toLocaleDateString('default', { month: 'short', year: 'numeric' }),
      status: isPendingMonth ? (bill.isPaid ? 'Paid' : 'Pending') : 'Paid'
    });
    current.setMonth(current.getMonth() + 1);
  }

  return history;
}

type BillForm = z.input<typeof billSchema>;

export default function BillsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);

  const currencySymbol = currencies.find(c => c.value === user?.currency)?.symbol || "₹";

  const { data: billsResponse, isLoading } = useQuery({
    queryKey: ["bills"],
    queryFn: billApi.list,
  });

  const bills = billsResponse?.data || [];

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => analyticsApi.getDashboard(),
    select: (res) => res.data,
  });
  const currentBalance = dashboardData?.currentBalance || 0;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
    defaultValues: { isPaid: false, isRecurring: true, reminderDays: 3 },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Bill>) => billApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill added successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to add bill"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bill> }) => billApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Bill updated successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to update bill"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => billApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill deleted");
    },
    onError: () => toast.error("Failed to delete bill"),
  });

  const togglePaidMutation = useMutation({
    mutationFn: ({ id, isPaid }: { id: string; isPaid: boolean }) => billApi.update(id, { isPaid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    reset({ name: "", amount: 0, dueDate: "", isPaid: false, isRecurring: true, reminderDays: 3 });
  };

  const handleEdit = (bill: Bill) => {
    setEditing(bill);
    setValue("name", bill.name);
    setValue("amount", Number(bill.amount));
    if (bill.dueDate) setValue("dueDate", bill.dueDate.substring(0, 10));
    setValue("isPaid", bill.isPaid);
    setValue("isRecurring", bill.isRecurring);
    setValue("reminderDays", bill.reminderDays);
    setIsOpen(true);
  };

  const undoPaymentMutation = useMutation({
    mutationFn: (id: string) => billApi.undoPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Bill payment undone successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to undo payment");
    }
  });

  const onSubmit = (formData: BillForm) => {
    const payload = {
      ...formData,
      dueDate: new Date(formData.dueDate).toISOString()
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bills & Reminders</h1>
          <p className="text-muted-foreground mt-1">Never miss a payment again</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient">
          <Plus className="h-4 w-4" /> Add Bill
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse h-24 bg-muted" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No upcoming bills</h3>
            <p className="text-muted-foreground text-sm mt-1">Add your utility, rent, or other bills to track them</p>
            <Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-4"><Plus className="h-4 w-4" /> Add Bill</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bills
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map((bill, i) => {
              const isOverdue = !bill.isPaid && new Date(bill.dueDate) < new Date();
              const billAmount = Number(bill.amount);
              let balanceWarning = null;

              if (!bill.isPaid) {
                if (currentBalance < billAmount) {
                  balanceWarning = { text: "Insufficient balance", color: "text-destructive" };
                } else if (currentBalance === billAmount) {
                  balanceWarning = { text: "Will take all of your balance", color: "text-orange-500" };
                } else if (billAmount > currentBalance * 0.5) {
                  balanceWarning = { text: "Will take majority of balance", color: "text-yellow-600 dark:text-yellow-500" };
                }
              }
              return (
                <motion.div key={bill.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`hover:shadow-md transition-all ${bill.isPaid ? 'opacity-60' : ''} ${isOverdue ? 'border-destructive/50 border' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-lg font-semibold truncate ${bill.isPaid ? 'line-through text-muted-foreground' : ''}`}>{bill.name}</h3>
                            {bill.isRecurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
                            {isOverdue && <Badge variant="destructive" className="text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Overdue</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> Due {formatDate(bill.dueDate)}
                            </p>
                            {balanceWarning && (
                              <p className={`text-xs flex items-center gap-1 font-medium ${balanceWarning.color}`}>
                                <AlertCircle className="h-3.5 w-3.5" /> {balanceWarning.text}
                              </p>
                            )}
                          </div>

                          {bill.isRecurring && bill.createdAt && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              {generateBillHistory(bill)?.map((h, idx, arr) => (
                                <Badge key={h.label} variant={h.status === 'Paid' ? 'success' : 'outline'} className="text-[10px] uppercase tracking-wider font-semibold">
                                  {h.label}: {h.status}
                                </Badge>
                              ))}

                              {bill.createdAt && generateBillHistory(bill)?.filter(h => h.status === 'Paid').length! > 0 && (
                                <ConfirmDeleteDialog title="Undo Last Payment" onConfirm={() => undoPaymentMutation.mutate(bill.id)}>
                                  <button title="Undo last payment" className="ml-1 text-muted-foreground hover:text-primary transition-colors focus:outline-none">
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                </ConfirmDeleteDialog>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-[260px] shrink-0">
                          <span className={`text-lg font-bold ${isOverdue ? 'text-destructive' : ''}`}>
                            {formatCurrency(Number(bill.amount))}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant={bill.isPaid ? "secondary" : "default"}
                              size="sm"
                              className="h-8 text-xs gap-1 px-2.5"
                              onClick={() => togglePaidMutation.mutate({ id: bill.id, isPaid: !bill.isPaid })}
                            >
                              {bill.isPaid ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>Paid</span>
                                </>
                              ) : (
                                <span>Mark Paid</span>
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(bill)}><Edit className="h-4 w-4" /></Button>
                            <ConfirmDeleteDialog title="Delete Bill" onConfirm={() => deleteMutation.mutate(bill.id)}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </ConfirmDeleteDialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bill" : "Add Bill"}</DialogTitle>
            <DialogDescription>{editing ? "Update your bill details" : "Add a new upcoming payment"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Bill Name</Label>
              <Input placeholder="e.g. Electricity, Rent, Internet" {...register("name")} />
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
                <Label>Due Date</Label>
                <Input type="date" {...register("dueDate")} />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remind me before (Days)</Label>
              <Input type="number" {...register("reminderDays")} />
              {errors.reminderDays && <p className="text-xs text-destructive">{errors.reminderDays.message}</p>}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="recurring" className="flex-1 cursor-pointer">
                  <div>Recurring Bill</div>
                  <div className="text-xs text-muted-foreground font-normal">Automatically rolls over to next month</div>
                </Label>
                <Switch id="recurring" checked={watch("isRecurring")} onCheckedChange={(v) => setValue("isRecurring", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="paid" className="flex-1 cursor-pointer">Mark as Paid</Label>
                <Switch id="paid" checked={watch("isPaid")} onCheckedChange={(v) => setValue("isPaid", v)} />
              </div>
            </div>

            <BalanceWarningCallout amount={watch("amount")} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Add"} Bill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
