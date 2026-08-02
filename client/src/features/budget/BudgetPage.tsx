import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Target, AlertTriangle } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { budgetApi, categoryApi } from "@/services/api";
import { formatCurrency, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Budget, Category } from "@/types";

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  period: z.enum(["MONTHLY", "YEARLY"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  alertThreshold: z.coerce.number().min(1).max(100),
});

type BudgetForm = z.infer<typeof budgetSchema>;

export default function BudgetPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const currencySymbol = currencies.find(c => c.value === user?.currency)?.symbol || "₹";

  const { data: budgetsResponse, isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: budgetApi.list,
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: categoryApi.list,
  });

  const budgets = budgetsResponse?.data || [];
  const categories = categoriesResponse?.data || [];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { period: "MONTHLY", alertThreshold: 80 },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Budget>) => budgetApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget added successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to create budget"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Budget> }) => budgetApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget updated successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to update budget"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget deleted");
    },
    onError: () => toast.error("Failed to delete budget"),
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    reset({ categoryId: "", amount: 0, period: "MONTHLY", startDate: "", endDate: "", alertThreshold: 80 });
  };

  const handleEdit = (budget: Budget) => {
    setEditing(budget);
    setValue("categoryId", budget.categoryId);
    setValue("amount", Number(budget.amount));
    setValue("period", budget.period);
    if (budget.startDate) setValue("startDate", budget.startDate.substring(0, 10));
    if (budget.endDate) setValue("endDate", budget.endDate.substring(0, 10));
    setValue("alertThreshold", Number(budget.alertThreshold));
    setIsOpen(true);
  };

  const onSubmit = (formData: BudgetForm) => {
    const payload = { 
      ...formData, 
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground mt-1">Set limits on your spending</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient">
          <Plus className="h-4 w-4" /> Create Budget
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse h-40 bg-muted" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No budgets yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Create a budget to control spending</p>
            <Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-4"><Plus className="h-4 w-4" /> Create Budget</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget, i) => {
            const category = categories.find(c => c.id === budget.categoryId);
            return (
              <motion.div key={budget.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {category && (
                          <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                            <CategoryIcon name={category.icon} className="h-4 w-4" />
                          </div>
                        )}
                        <CardTitle className="text-lg">{category?.name || 'Unknown Category'}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(budget)}><Edit className="h-4 w-4" /></Button>
                        <ConfirmDeleteDialog title="Delete Budget" onConfirm={() => deleteMutation.mutate(budget.id)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </ConfirmDeleteDialog>
                      </div>
                    </div>
                    <CardDescription>{budget.period} budget</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end pt-4">
                    <div className="flex items-end justify-between mb-2">
                      <div className="text-2xl font-bold">{formatCurrency(Number(budget.amount))}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      Alerts at {budget.alertThreshold}% usage
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
            <DialogTitle>{editing ? "Edit Budget" : "Create Budget"}</DialogTitle>
            <DialogDescription>{editing ? "Update your budget details" : "Set a new spending limit"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: Category) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2"><CategoryIcon name={c.icon} className="h-4 w-4" /> {c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ({currencySymbol})</Label>
                <Input type="number" step="0.01" {...register("amount")} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                {!errors.amount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={watch("period")} onValueChange={(v: any) => setValue("period", v)}>
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
                <Label>Start Date</Label>
                <Input type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input type="date" {...register("endDate")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alert Threshold (%)</Label>
              <Input type="number" {...register("alertThreshold")} />
              <p className="text-xs text-muted-foreground">Get notified when you spend this % of your budget</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Create"} Budget
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
