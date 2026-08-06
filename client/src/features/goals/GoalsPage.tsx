import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { goalApi } from "@/services/api";
import { formatCurrency, formatDate, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Goal } from "@/types";

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().positive("Target amount must be greater than 0"),
  currentAmount: z.coerce.number().min(0, "Current amount cannot be negative"),
  deadline: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

type GoalForm = z.infer<typeof goalSchema>;

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  
  const currencySymbol = currencies.find(c => c.value === user?.currency)?.symbol || "₹";

  const { data: goalsResponse, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalApi.list,
  });

  const goals = goalsResponse?.data || [];

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { currentAmount: 0, color: "#3b82f6", icon: "🏆" },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Goal>) => goalApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal added successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to create goal"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) => goalApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal updated successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to update goal"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted");
    },
    onError: () => toast.error("Failed to delete goal"),
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    reset({ name: "", targetAmount: 0, currentAmount: 0, deadline: "", color: "#3b82f6", icon: "🏆" });
  };

  const handleEdit = (goal: Goal) => {
    setEditing(goal);
    setValue("name", goal.name);
    setValue("targetAmount", Number(goal.targetAmount));
    setValue("currentAmount", Number(goal.currentAmount));
    if (goal.deadline) setValue("deadline", goal.deadline.split("T")[0]);
    setValue("color", goal.color);
    setValue("icon", goal.icon);
    setIsOpen(true);
  };

  const onSubmit = (formData: GoalForm) => {
    const payload = { 
      ...formData, 
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financial Goals</h1>
          <p className="text-muted-foreground mt-1">Track your progress towards big purchases and savings</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient">
          <Plus className="h-4 w-4" /> Add Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse h-48 bg-muted" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No goals set</h3>
            <p className="text-muted-foreground text-sm mt-1">Set a financial goal to start saving</p>
            <Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-4"><Plus className="h-4 w-4" /> Add Goal</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal, i) => {
            const progress = Math.min(100, Math.max(0, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100));
            return (
              <motion.div key={goal.id} className="h-full" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl p-2 rounded-lg" style={{ backgroundColor: `${goal.color}20` }}>
                          {goal.icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{goal.name}</CardTitle>
                          {goal.deadline && (
                            <CardDescription>Target: {formatDate(goal.deadline)}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(goal)}><Edit className="h-4 w-4" /></Button>
                        <ConfirmDeleteDialog title="Delete Goal" onConfirm={() => deleteMutation.mutate(goal.id)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </ConfirmDeleteDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between text-sm mt-auto">
                      <span className="font-medium">{formatCurrency(Number(goal.currentAmount))}</span>
                      <span className="text-muted-foreground">{formatCurrency(Number(goal.targetAmount))}</span>
                    </div>
                    <Progress value={progress} className="h-3" style={{ '--progress-color': goal.color } as any} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{progress.toFixed(1)}% Completed</span>
                      <span>{formatCurrency(Number(goal.targetAmount) - Number(goal.currentAmount))} left</span>
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
            <DialogTitle>{editing ? "Edit Goal" : "Add Goal"}</DialogTitle>
            <DialogDescription>{editing ? "Update your goal's progress" : "Set a new financial target"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input placeholder="e.g. New Car, Vacation, Emergency Fund" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Amount ({currencySymbol})</Label>
                <Input type="number" step="0.01" {...register("targetAmount")} />
                {errors.targetAmount && <p className="text-xs text-destructive">{errors.targetAmount.message}</p>}
                {!errors.targetAmount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
              <div className="space-y-2">
                <Label>Current Saved ({currencySymbol})</Label>
                <Input type="number" step="0.01" {...register("currentAmount")} />
                {errors.currentAmount && <p className="text-xs text-destructive">{errors.currentAmount.message}</p>}
                {!errors.currentAmount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Date (Optional)</Label>
              <Input type="date" {...register("deadline")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emoji Icon</Label>
                <Input {...register("icon")} placeholder="🚗" maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-12 p-1 h-10" {...register("color")} />
                  <Input type="text" {...register("color")} className="flex-1" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Add"} Goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
