import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Wallet, Calculator, Plus, Trash2, Calendar, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { salaryApi } from "@/services/api";
import { formatCurrency, getMonthName, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { SalaryRecord } from "@/types";

const salarySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
  baseSalary: z.coerce.number().positive("Base salary must be positive"),
  leaves: z.coerce.number().min(0).optional(),
  halfDays: z.coerce.number().min(0).optional(),
  bonus: z.coerce.number().min(0).optional(),
  otherDeductions: z.coerce.number().min(0).optional(),
  actualCredited: z.coerce.number().min(0).optional(),
  creditedDate: z.string().optional(),
  discrepancyReason: z.string().optional(),
});

type SalaryForm = z.infer<typeof salarySchema>;

export default function SalaryPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currencySymbol = currencies.find(c => c.value === (user?.currency || 'INR'))?.symbol || '₹';
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);
  const now = new Date();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<SalaryForm>({
    resolver: zodResolver(salarySchema),
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear(), leaves: 0, halfDays: 0, bonus: 0, otherDeductions: 0 },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["salary"],
    queryFn: () => salaryApi.list(),
    select: (res) => (res as any).data as { records: SalaryRecord[], balance: { casualLeaves: number, sickLeaves: number } },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SalaryRecord>) => salaryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Salary record saved");
      setIsOpen(false);
      reset();
      setSelectedRecord(null);
    },
    onError: () => toast.error("Failed to save salary record"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SalaryRecord> }) => salaryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Salary record updated");
      setIsOpen(false);
      reset();
      setSelectedRecord(null);
    },
    onError: () => toast.error("Failed to update salary record"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salaryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Salary record deleted");
    },
  });

  const baseSalary = Number(watch("baseSalary")) || 0;
  const leaves = Number(watch("leaves")) || 0;
  const halfDays = Number(watch("halfDays")) || 0;
  const bonus = Number(watch("bonus")) || 0;
  const otherDeductions = Number(watch("otherDeductions")) || 0;
  const actualCredited = Number(watch("actualCredited")) || 0;

  const perDay = baseSalary / 30;
  const availableCL = data?.balance?.casualLeaves || 0;
  const availableSL = data?.balance?.sickLeaves || 0;

  const unpaidCL = Math.max(0, leaves - availableCL);
  const unpaidSL = Math.max(0, (halfDays / 2) - availableSL);
  const unpaidHalfDays = unpaidSL * 2;

  const leaveDeduction = unpaidCL * perDay;
  const halfDayDeduction = unpaidHalfDays * (perDay / 2);
  const expected = Math.max(0, baseSalary - leaveDeduction - halfDayDeduction - otherDeductions + bonus);

  const hasDiscrepancy = actualCredited > 0 && Math.abs(actualCredited - expected) > 10;

  const handleEdit = (record: SalaryRecord) => {
    setSelectedRecord(record);
    reset({
      month: record.month,
      year: record.year,
      baseSalary: Number(record.baseSalary),
      leaves: record.leaves,
      halfDays: record.halfDays,
      bonus: Number(record.bonus),
      otherDeductions: Number(record.otherDeductions),
      actualCredited: record.actualCredited ? Number(record.actualCredited) : 0,
      creditedDate: record.creditedDate ? new Date(record.creditedDate).toISOString().split('T')[0] : "",
      discrepancyReason: record.discrepancyReason || "",
    });
    setIsOpen(true);
  };

  const onSubmit = (formData: SalaryForm) => {
    if (selectedRecord) {
      updateMutation.mutate({ id: selectedRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const latestSalary = data?.records && data.records.length > 0 ? data.records[0] : null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Salary & Leaves</h1>
          <p className="text-muted-foreground mt-1">Manage expected pay, auto-sync income, and track leave balances</p>
        </div>
        <Button onClick={() => { setSelectedRecord(null); reset({ month: now.getMonth() + 1, year: now.getFullYear(), leaves: 0, halfDays: 0, bonus: 0, otherDeductions: 0 }); setIsOpen(true); }} variant="gradient"><Plus className="h-4 w-4 mr-2" /> New Record</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Leave Balance</CardTitle>
            <CardDescription>Available paid time off</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Casual Leaves</p>
              <p className="text-3xl font-bold text-indigo-500">{data?.balance?.casualLeaves.toFixed(1) || "0.0"}</p>
            </div>
            <div className="h-12 w-px bg-border"></div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Sick Leaves</p>
              <p className="text-3xl font-bold text-rose-500">{data?.balance?.sickLeaves.toFixed(1) || "0.0"}</p>
            </div>
          </CardContent>
        </Card>

        {latestSalary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Latest Expected Salary</CardTitle>
              <CardDescription>{getMonthName(latestSalary.month)} {latestSalary.year}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-bold text-emerald-500">{formatCurrency(Number(latestSalary.expectedSalary))}</p>
                  {latestSalary.actualCredited && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Credited: {formatCurrency(Number(latestSalary.actualCredited))}
                      {latestSalary.isSynced && " (Synced)"}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Base: {formatCurrency(Number(latestSalary.baseSalary))}</p>
                  <p className="text-sm text-rose-500">
                    -{formatCurrency(Number(latestSalary.baseSalary) - Number(latestSalary.expectedSalary) + Number(latestSalary.bonus))} (Deductions)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Salary History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
          ) : !data?.records || data.records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No salary records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Month</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Base</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Leaves Taken</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Bonus/Ded.</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Expected</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Credited</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((record) => (
                    <tr key={record.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-medium">{getMonthName(record.month)} {record.year}</div>
                      </td>
                      <td className="py-3 px-2 text-right">{formatCurrency(Number(record.baseSalary))}</td>
                      <td className="py-3 px-2 text-right text-rose-500">
                        {record.leaves > 0 ? `${record.leaves} L` : ''} {record.halfDays > 0 ? `${record.halfDays} HD` : ''}
                        {(record.leaves === 0 && record.halfDays === 0) ? '-' : ''}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {Number(record.bonus) > 0 && <span className="text-emerald-500">+{formatCurrency(Number(record.bonus))}</span>}
                        {Number(record.otherDeductions) > 0 && <span className="text-rose-500 block">-{formatCurrency(Number(record.otherDeductions))}</span>}
                      </td>
                      <td className="py-3 px-2 text-right font-bold">{formatCurrency(Number(record.expectedSalary))}</td>
                      <td className="py-3 px-2 text-right font-medium text-primary">
                        {record.actualCredited ? formatCurrency(Number(record.actualCredited)) : '-'}
                        {record.creditedDate && <div className="text-xs text-muted-foreground font-normal">{new Date(record.creditedDate).toLocaleDateString()}</div>}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {record.isSynced ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">Synced</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => handleEdit(record)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                          </Button>
                          <ConfirmDeleteDialog
                            title="Delete Salary Record"
                            description="Are you sure? This action cannot be undone."
                            onConfirm={() => deleteMutation.mutate(record.id)}
                          >
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </ConfirmDeleteDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add / Update Salary Record</DialogTitle>
            <DialogDescription>Calculate your expected salary for the month.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <Input type="number" id="month" min="1" max="12" {...register("month")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input type="number" id="year" min="2000" max="2100" {...register("year")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseSalary">Base Salary (per month)</Label>
              <Input type="number" id="baseSalary" step="0.01" {...register("baseSalary")} />
              {errors.baseSalary && <p className="text-xs text-destructive">{errors.baseSalary.message}</p>}
              {!errors.baseSalary && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leaves">Casual Leaves Taken</Label>
                <Input type="number" id="leaves" min="0" {...register("leaves")} />
                <p className="text-xs text-muted-foreground">Available: {availableCL.toFixed(1)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="halfDays">Sick Half-Days Taken</Label>
                <Input type="number" id="halfDays" min="0" {...register("halfDays")} />
                <p className="text-xs text-muted-foreground">Available: {availableSL.toFixed(1)} SLs ({(availableSL * 2).toFixed(1)} HDs)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bonus">Bonus / Allowances</Label>
                <Input type="number" id="bonus" step="0.01" {...register("bonus")} />
                <p className="text-xs text-muted-foreground mt-1">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherDeductions">Other Deductions</Label>
                <Input type="number" id="otherDeductions" step="0.01" {...register("otherDeductions")} />
                <p className="text-xs text-muted-foreground mt-1">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-2 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Base Salary</span>
                <span>{formatCurrency(baseSalary)}</span>
              </div>
              {unpaidCL > 0 && (
                <div className="flex justify-between items-center text-sm text-rose-500">
                  <span>Unpaid Casual Leave Ded. ({unpaidCL} days)</span>
                  <span>-{formatCurrency(leaveDeduction)}</span>
                </div>
              )}
              {unpaidHalfDays > 0 && (
                <div className="flex justify-between items-center text-sm text-rose-500">
                  <span>Unpaid Sick Ded. ({unpaidHalfDays} half-days)</span>
                  <span>-{formatCurrency(halfDayDeduction)}</span>
                </div>
              )}
              {otherDeductions > 0 && (
                <div className="flex justify-between items-center text-sm text-rose-500">
                  <span>Other Deductions</span>
                  <span>-{formatCurrency(otherDeductions)}</span>
                </div>
              )}
              {bonus > 0 && (
                <div className="flex justify-between items-center text-sm text-emerald-500">
                  <span>Bonus</span>
                  <span>+{formatCurrency(bonus)}</span>
                </div>
              )}
              <div className="pt-2 border-t flex justify-between items-center font-bold">
                <span>Expected Salary</span>
                <span className="text-primary">{formatCurrency(expected)}</span>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h3 className="font-medium text-sm mb-3">Actual Credited Amount (Optional)</h3>
              <p className="text-xs text-muted-foreground mb-4">If filled, this will automatically create an Income transaction and sync it.</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="actualCredited">Actual Received</Label>
                  <Input type="number" id="actualCredited" step="0.01" {...register("actualCredited")} placeholder={expected > 0 ? expected.toString() : ""} />
                  <p className="text-xs text-muted-foreground mt-1">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditedDate">Credited Date</Label>
                  <Input type="date" id="creditedDate" max={new Date().toISOString().split("T")[0]} {...register("creditedDate")} />
                </div>
              </div>

              {hasDiscrepancy && (
                <div className="space-y-2 mb-2 p-3 bg-rose-500/10 text-rose-600 rounded-md border border-rose-500/20">
                  <Label htmlFor="discrepancyReason" className="text-rose-700">Reason for Discrepancy (± {formatCurrency(Math.abs(actualCredited - expected))})</Label>
                  <Input type="text" id="discrepancyReason" className="bg-white/50" {...register("discrepancyReason")} placeholder="e.g. Unpaid taxes, late fee..." />
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
