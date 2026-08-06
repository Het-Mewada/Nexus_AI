import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { liabilityApi } from "@/services/api";
import { formatCurrency, formatDate, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Loan, Insurance } from "@/types";

const loanSchema = z.object({
  type: z.string().min(1, "Type is required"),
  name: z.string().min(1, "Name is required"),
  principalAmount: z.coerce.number().positive(),
  outstandingAmount: z.coerce.number().min(0),
  interestRate: z.coerce.number().positive(),
  emiAmount: z.coerce.number().positive(),
  totalTenureMonths: z.coerce.number().positive(),
  remainingMonths: z.coerce.number().min(0),
  startDate: z.string().min(1),
  dueDate: z.coerce.number().min(1).max(31),
});

const insuranceSchema = z.object({
  type: z.string().min(1, "Type is required"),
  provider: z.string().min(1, "Provider is required"),
  policyNumber: z.string().min(1, "Policy number is required"),
  premiumAmount: z.coerce.number().positive(),
  coverageAmount: z.coerce.number().positive(),
  renewalDate: z.string().min(1),
});

type LoanForm = z.infer<typeof loanSchema>;
type InsuranceForm = z.infer<typeof insuranceSchema>;

export default function LiabilitiesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currencySymbol = currencies.find(c => c.value === (user?.currency || 'INR'))?.symbol || '₹';
  const [loanOpen, setLoanOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);

  const { data: loansData, isLoading: isLoadingLoans } = useQuery({
    queryKey: ["loans"],
    queryFn: liabilityApi.getLoans,
  });

  const { data: insuranceData, isLoading: isLoadingInsurance } = useQuery({
    queryKey: ["insurance"],
    queryFn: liabilityApi.getInsurance,
  });

  const loans = loansData?.data || [];
  const insurances = insuranceData?.data || [];

  const loanForm = useForm<LoanForm>({ resolver: zodResolver(loanSchema) });
  const insuranceForm = useForm<InsuranceForm>({ resolver: zodResolver(insuranceSchema) });

  const loanCreate = useMutation({
    mutationFn: (data: Partial<Loan>) => liabilityApi.addLoan(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["loans"] }); toast.success("Loan added"); closeLoan(); },
  });
  const loanUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Loan> }) => liabilityApi.updateLoan(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["loans"] }); toast.success("Loan updated"); closeLoan(); },
  });
  const loanDelete = useMutation({
    mutationFn: (id: string) => liabilityApi.deleteLoan(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["loans"] }); toast.success("Loan deleted"); },
  });

  const insCreate = useMutation({
    mutationFn: (data: Partial<Insurance>) => liabilityApi.addInsurance(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance"] }); toast.success("Insurance added"); closeInsurance(); },
  });
  const insUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Insurance> }) => liabilityApi.updateInsurance(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance"] }); toast.success("Insurance updated"); closeInsurance(); },
  });
  const insDelete = useMutation({
    mutationFn: (id: string) => liabilityApi.deleteInsurance(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance"] }); toast.success("Insurance deleted"); },
  });

  const closeLoan = () => { setLoanOpen(false); setEditingLoan(null); loanForm.reset(); };
  const closeInsurance = () => { setInsuranceOpen(false); setEditingInsurance(null); insuranceForm.reset(); };

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    Object.keys(loan).forEach(k => {
      if (k === 'startDate') loanForm.setValue(k, loan.startDate ? loan.startDate.substring(0, 10) : "");
      else if (k !== 'id' && k !== 'userId') loanForm.setValue(k as keyof LoanForm, loan[k as keyof Loan] as any);
    });
    setLoanOpen(true);
  };

  const handleEditInsurance = (ins: Insurance) => {
    setEditingInsurance(ins);
    Object.keys(ins).forEach(k => {
      if (k === 'renewalDate') insuranceForm.setValue(k, ins.renewalDate ? ins.renewalDate.substring(0, 10) : "");
      else if (k !== 'id' && k !== 'userId') insuranceForm.setValue(k as keyof InsuranceForm, ins[k as keyof Insurance] as any);
    });
    setInsuranceOpen(true);
  };

  const submitLoan = (data: LoanForm) => {
    const payload = { ...data, startDate: new Date(data.startDate).toISOString() };
    if (editingLoan) loanUpdate.mutate({ id: editingLoan.id, data: payload });
    else loanCreate.mutate(payload);
  };

  const submitInsurance = (data: InsuranceForm) => {
    const payload = { ...data, renewalDate: new Date(data.renewalDate).toISOString() };
    if (editingInsurance) insUpdate.mutate({ id: editingInsurance.id, data: payload });
    else insCreate.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Liabilities & Insurance</h1>
        <p className="text-muted-foreground mt-1">Manage your debts and coverage</p>
      </div>

      <Tabs defaultValue="loans">
        <TabsList className="inline-flex flex-wrap h-auto justify-start">
          <TabsTrigger value="loans">Loans & Debts</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setLoanOpen(true)} variant="gradient">
              <Plus className="h-4 w-4" /> Add Loan
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loans.map(loan => (
              <Card key={loan.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{loan.name}</CardTitle>
                      <CardDescription>{loan.type} â€¢ {loan.interestRate}% Interest</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditLoan(loan)}><Edit className="h-4 w-4" /></Button>
                      <ConfirmDeleteDialog title="Delete Loan" onConfirm={() => loanDelete.mutate(loan.id)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </ConfirmDeleteDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(Number(loan.outstandingAmount))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Monthly EMI</p>
                      <p className="font-semibold">{formatCurrency(Number(loan.emiAmount))}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                    <span>{loan.remainingMonths} months left</span>
                    <span>Due on {loan.dueDate}th</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insurance" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setInsuranceOpen(true)} variant="gradient">
              <Plus className="h-4 w-4" /> Add Insurance
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insurances.map(ins => (
              <Card key={ins.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{ins.provider}</CardTitle>
                      <CardDescription>{ins.type} â€¢ Policy: {ins.policyNumber}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditInsurance(ins)}><Edit className="h-4 w-4" /></Button>
                      <ConfirmDeleteDialog title="Delete Insurance" onConfirm={() => insDelete.mutate(ins.id)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </ConfirmDeleteDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-muted-foreground">Sum Insured</p>
                      <p className="text-xl font-bold">{formatCurrency(Number(ins.coverageAmount))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Premium</p>
                      <p className="font-semibold">{formatCurrency(Number(ins.premiumAmount))}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 p-2 rounded-md dark:bg-blue-950/30 dark:text-blue-400">
                    <Shield className="h-3 w-3" /> Renews on {formatDate(ins.renewalDate)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Loan Dialog */}
      <Dialog open={loanOpen} onOpenChange={(open) => { if (!open) closeLoan(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingLoan ? 'Edit' : 'Add'} Loan</DialogTitle></DialogHeader>
          <form onSubmit={loanForm.handleSubmit(submitLoan)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select value={loanForm.watch("type")} onValueChange={v => loanForm.setValue("type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOME">Home Loan</SelectItem>
                    <SelectItem value="VEHICLE">Car Loan</SelectItem>
                    <SelectItem value="PERSONAL">Personal Loan</SelectItem>
                    <SelectItem value="EDUCATION">Education Loan</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bank/Lender Name</Label>
                <Input {...loanForm.register("name")} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Principal Amount</Label>
                <Input type="number" {...loanForm.register("principalAmount", { valueAsNumber: true })} />
                {loanForm.formState.errors.principalAmount && <p className="text-xs text-destructive">{loanForm.formState.errors.principalAmount.message}</p>}
                {!loanForm.formState.errors.principalAmount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
              <div className="space-y-2">
                <Label>Outstanding Amount</Label>
                <Input type="number" {...loanForm.register("outstandingAmount", { valueAsNumber: true })} />
                {loanForm.formState.errors.outstandingAmount && <p className="text-xs text-destructive">{loanForm.formState.errors.outstandingAmount.message}</p>}
                {!loanForm.formState.errors.outstandingAmount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Interest (%)</Label>
                <Input type="number" step="0.1" {...loanForm.register("interestRate", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>EMI Amount</Label>
                <Input type="number" {...loanForm.register("emiAmount", { valueAsNumber: true })} />
                {loanForm.formState.errors.emiAmount && <p className="text-xs text-destructive">{loanForm.formState.errors.emiAmount.message}</p>}
                {!loanForm.formState.errors.emiAmount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
              <div className="space-y-2">
                <Label>Due Day</Label>
                <Input type="number" min="1" max="31" {...loanForm.register("dueDate")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Tenure (Months)</Label>
                <Input type="number" {...loanForm.register("totalTenureMonths")} />
              </div>
              <div className="space-y-2">
                <Label>Remaining (Months)</Label>
                <Input type="number" {...loanForm.register("remainingMonths")} />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" max={new Date().toISOString().split("T")[0]} {...loanForm.register("startDate")} />
              </div>
            </div>

            <DialogFooter><Button type="submit" variant="gradient">Save Loan</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Insurance Dialog */}
      <Dialog open={insuranceOpen} onOpenChange={(open) => { if (!open) closeInsurance(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingInsurance ? 'Edit' : 'Add'} Insurance</DialogTitle></DialogHeader>
          <form onSubmit={insuranceForm.handleSubmit(submitInsurance)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Insurance Type</Label>
                <Select value={insuranceForm.watch("type")} onValueChange={v => insuranceForm.setValue("type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIFE">Life Insurance</SelectItem>
                    <SelectItem value="HEALTH">Health Insurance</SelectItem>
                    <SelectItem value="VEHICLE">Vehicle Insurance</SelectItem>
                    <SelectItem value="PROPERTY">Property Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Provider/Company</Label>
                <Input {...insuranceForm.register("provider")} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Policy Number</Label>
              <Input {...insuranceForm.register("policyNumber")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sum Insured (Cover)</Label>
                <Input type="number" {...insuranceForm.register("coverageAmount", { valueAsNumber: true })} />
                {insuranceForm.formState.errors.coverageAmount && <p className="text-xs text-destructive">{insuranceForm.formState.errors.coverageAmount.message}</p>}
                {!insuranceForm.formState.errors.coverageAmount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
              <div className="space-y-2">
                <Label>Premium Amount</Label>
                <Input type="number" {...insuranceForm.register("premiumAmount", { valueAsNumber: true })} />
                {insuranceForm.formState.errors.premiumAmount && <p className="text-xs text-destructive">{insuranceForm.formState.errors.premiumAmount.message}</p>}
                {!insuranceForm.formState.errors.premiumAmount && <p className="text-xs text-muted-foreground">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Renewal Date</Label>
              <Input type="date" {...insuranceForm.register("renewalDate")} />
            </div>

            <DialogFooter><Button type="submit" variant="gradient">Save Insurance</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
