import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, TrendingUp, Edit, Trash2, Search, RefreshCw, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Switch } from "@/components/ui/switch";
import { incomeApi } from "@/services/api";
import { formatCurrency, formatDate, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks";
import { toast } from "sonner";
import type { Income } from "@/types";

const incomeSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  source: z.string().min(1, "Source is required").max(100, "Source is too long"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().max(500, "Notes are too long").optional(),
  isRecurring: z.boolean().optional(),
  currency: z.string().optional(),
});

type IncomeForm = z.infer<typeof incomeSchema>;

export default function IncomePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  
  const currencySymbol = currencies.find(c => c.value === user?.currency)?.symbol || "₹";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const debouncedSearch = useDebounce(search, 300);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<IncomeForm>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { isRecurring: false, currency: "INR" },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["income", page, debouncedSearch, sortBy, sortOrder],
    queryFn: () => incomeApi.list({ page: String(page), limit: "20", search: debouncedSearch || undefined, sortBy, sortOrder } as Record<string, string>),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Income>) => incomeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Income added successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to create income"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Income> }) => incomeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Income updated successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to update income"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incomeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Income deleted");
    },
    onError: () => toast.error("Failed to delete income"),
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    reset({ amount: 0, source: "", date: "", notes: "", isRecurring: false, currency: "INR" });
  };

  const handleEdit = (income: Income) => {
    setEditing(income);
    setValue("amount", Number(income.amount));
    setValue("source", income.source);
    setValue("date", income.date.split("T")[0]!);
    setValue("notes", income.notes || "");
    setValue("isRecurring", income.isRecurring);
    setValue("currency", income.currency);
    setIsOpen(true);
  };

  const onSubmit = (formData: IncomeForm) => {
    const payload = { ...formData, date: new Date(formData.date).toISOString() };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const incomes = (data?.data || []) as Income[];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Income</h1>
          <p className="text-muted-foreground mt-1">Track and manage your income sources</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient">
          <Plus className="h-4 w-4" /> Add Income
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by source or notes..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="source">Source</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Income List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      ) : incomes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No income records</h3>
            <p className="text-muted-foreground text-sm mt-1">Add your first income to get started</p>
            <Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-4"><Plus className="h-4 w-4" /> Add Income</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {incomes.map((income, i) => (
            <motion.div key={income.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{income.source}</p>
                        {income.isRecurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
                        {income.isAutoSynced && (
                          <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-500 border-indigo-500/20 flex items-center gap-1 font-medium">
                            <Lock className="h-3 w-3" /> Auto-Synced
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(income.date)}{income.notes ? ` · ${income.notes}` : ""}</p>
                    </div>
                    <span className="text-lg font-bold text-emerald-500">+{formatCurrency(Number(income.amount))}</span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleEdit(income)}
                        disabled={income.isAutoSynced}
                        title={income.isAutoSynced ? "Synced records cannot be edited directly" : "Edit"}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {income.isAutoSynced ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500" title="Auto-synced record (Non-deleteable)">
                              <Lock className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-amber-500">
                                <Lock className="h-5 w-5" /> Non-Deleteable Record
                              </DialogTitle>
                              <DialogDescription className="pt-2 text-sm leading-relaxed">
                                This income entry was automatically created from a shared group wallet withdrawal, bill, or subscription. Auto-synced entries cannot be deleted or modified directly from personal incomes.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Understood</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <ConfirmDeleteDialog title="Delete Income" onConfirm={() => deleteMutation.mutate(income.id)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </ConfirmDeleteDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Income" : "Add Income"}</DialogTitle>
            <DialogDescription>{editing ? "Update this income record" : "Record a new income"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ({currencySymbol})</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                {!errors.amount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" max={new Date().toISOString().split("T")[0]} {...register("date")} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input placeholder="e.g. Salary, Freelance, Investment" {...register("source")} />
              {errors.source && <p className="text-xs text-destructive">{errors.source.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Add any notes..." {...register("notes")} />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="recurring" checked={watch("isRecurring")} onCheckedChange={(v) => setValue("isRecurring", v)} />
              <Label htmlFor="recurring">Recurring income</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Add"} Income
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
