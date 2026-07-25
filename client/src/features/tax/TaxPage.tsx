import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Calculator, Save, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { taxApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { TaxProfile } from "@/types";

const taxSchema = z.object({
  taxRegime: z.enum(["OLD", "NEW"]),
  assessmentYear: z.string().min(1, "Assessment year is required"),
  basicSalary: z.coerce.number().min(0),
  hra: z.coerce.number().min(0),
  lta: z.coerce.number().min(0),
  specialAllowance: z.coerce.number().min(0),
  pfDeduction: z.coerce.number().min(0),
  ptDeduction: z.coerce.number().min(0),
  investments80c: z.coerce.number().min(0),
  medical80d: z.coerce.number().min(0),
  educationLoan80e: z.coerce.number().min(0),
  homeLoanInterest24b: z.coerce.number().min(0),
  nps80ccd: z.coerce.number().min(0),
  otherDeductions: z.coerce.number().min(0),
});

type TaxForm = z.infer<typeof taxSchema>;

export default function TaxPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<TaxProfile | null>(null);

  const { data: taxResponse, isLoading } = useQuery({
    queryKey: ["taxes"],
    queryFn: taxApi.list,
  });

  const taxProfiles = taxResponse?.data || [];
  
  // Sort by assessment year descending
  const sortedProfiles = [...taxProfiles].sort((a, b) => b.assessmentYear.localeCompare(a.assessmentYear));

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TaxForm>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      taxRegime: "NEW",
      assessmentYear: "2024-2025",
      basicSalary: 0, hra: 0, lta: 0, specialAllowance: 0, pfDeduction: 0, ptDeduction: 0,
      investments80c: 0, medical80d: 0, educationLoan80e: 0, homeLoanInterest24b: 0, nps80ccd: 0, otherDeductions: 0
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<TaxProfile>) => taxApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax profile saved");
      handleClose();
    },
    onError: () => toast.error("Failed to save tax profile"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaxProfile> }) => taxApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax profile updated");
      handleClose();
    },
    onError: () => toast.error("Failed to update tax profile"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taxApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast.success("Tax profile deleted");
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    reset();
  };

  const handleEdit = (profile: TaxProfile) => {
    setEditing(profile);
    Object.keys(profile).forEach((key) => {
      if (key !== "id" && key !== "userId") {
        setValue(key as keyof TaxForm, profile[key as keyof TaxProfile] as any);
      }
    });
    setIsOpen(true);
  };

  const onSubmit = (formData: TaxForm) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Basic India tax calculation logic for UI display
  const calculateTax = (profile: TaxProfile) => {
    const grossIncome = Number(profile.basicSalary) + Number(profile.hra) + Number(profile.lta) + Number(profile.specialAllowance);
    
    let totalDeductions = 0;
    if (profile.taxRegime === "OLD") {
      const standardDeduction = 50000;
      const section80c = Math.min(150000, Number(profile.investments80c));
      const section80d = Math.min(25000, Number(profile.medical80d));
      const section80ccd = Math.min(50000, Number(profile.nps80ccd));
      const section24b = Math.min(200000, Number(profile.homeLoanInterest24b));
      
      totalDeductions = standardDeduction + section80c + section80d + section80ccd + section24b + 
                        Number(profile.pfDeduction) + Number(profile.ptDeduction) + 
                        Number(profile.educationLoan80e) + Number(profile.otherDeductions);
    } else {
      // New regime allows standard deduction from FY 2023-24
      totalDeductions = 50000;
    }
    
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);
    
    // Simplified tax calculation (Not exactly correct for all edge cases, just for UI purposes)
    let tax = 0;
    if (profile.taxRegime === "OLD") {
      if (taxableIncome > 1000000) tax = 112500 + (taxableIncome - 1000000) * 0.3;
      else if (taxableIncome > 500000) tax = 12500 + (taxableIncome - 500000) * 0.2;
      else if (taxableIncome > 250000) tax = (taxableIncome - 250000) * 0.05;
    } else {
      if (taxableIncome <= 700000) tax = 0; // Rebate
      else if (taxableIncome > 1500000) tax = 150000 + (taxableIncome - 1500000) * 0.3;
      else if (taxableIncome > 1200000) tax = 90000 + (taxableIncome - 1200000) * 0.2;
      else if (taxableIncome > 900000) tax = 45000 + (taxableIncome - 900000) * 0.15;
      else if (taxableIncome > 600000) tax = 15000 + (taxableIncome - 600000) * 0.1;
      else if (taxableIncome > 300000) tax = (taxableIncome - 300000) * 0.05;
    }
    
    // Add 4% cess
    const totalTax = tax > 0 ? tax * 1.04 : 0;
    
    return { grossIncome, totalDeductions, taxableIncome, totalTax };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tax Planning</h1>
          <p className="text-muted-foreground mt-1">Estimate your income tax and plan deductions</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient">
          <Plus className="h-4 w-4" /> New Tax Profile
        </Button>
      </div>

      {isLoading ? (
        <Card className="animate-pulse h-64 bg-muted" />
      ) : sortedProfiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calculator className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No tax profiles</h3>
            <p className="text-muted-foreground text-sm mt-1">Create a profile to estimate your tax liability</p>
            <Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-4"><Plus className="h-4 w-4" /> Create Profile</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedProfiles.map((profile) => {
            const { grossIncome, totalDeductions, taxableIncome, totalTax } = calculateTax(profile);
            return (
              <Card key={profile.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        FY {profile.assessmentYear} 
                        <Badge variant={profile.taxRegime === 'NEW' ? 'default' : 'secondary'}>
                          {profile.taxRegime} Regime
                        </Badge>
                      </CardTitle>
                      <CardDescription>Estimated Tax Liability</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(profile)}><Edit className="h-4 w-4" /></Button>
                      <ConfirmDeleteDialog title="Delete Tax Profile" onConfirm={() => deleteMutation.mutate(profile.id)}>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </ConfirmDeleteDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
                    <div className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Gross Income</p>
                      <h3 className="text-2xl font-bold">{formatCurrency(grossIncome)}</h3>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Total Deductions</p>
                      <h3 className="text-2xl font-bold text-emerald-600">-{formatCurrency(totalDeductions)}</h3>
                      {profile.taxRegime === 'NEW' && <p className="text-xs text-muted-foreground mt-1">Limited deductions in New Regime</p>}
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Taxable Income</p>
                      <h3 className="text-2xl font-bold">{formatCurrency(taxableIncome)}</h3>
                    </div>
                    <div className="p-6 bg-primary/5">
                      <p className="text-sm font-medium mb-1 text-primary">Estimated Tax</p>
                      <h3 className="text-3xl font-bold text-primary">{formatCurrency(totalTax)}</h3>
                      {totalTax === 0 && <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Zero Tax Liability!</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tax Profile" : "Create Tax Profile"}</DialogTitle>
            <DialogDescription>Enter your income and deduction details to estimate tax</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Financial Year</Label>
                <Select value={watch("assessmentYear")} onValueChange={(v) => setValue("assessmentYear", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023-2024">2023-2024</SelectItem>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tax Regime</Label>
                <Select value={watch("taxRegime")} onValueChange={(v: any) => setValue("taxRegime", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New Tax Regime</SelectItem>
                    <SelectItem value="OLD">Old Tax Regime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Income</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basic Salary</Label>
                  <Input type="number" {...register("basicSalary")} />
                </div>
                <div className="space-y-2">
                  <Label>HRA</Label>
                  <Input type="number" {...register("hra")} />
                </div>
                <div className="space-y-2">
                  <Label>LTA</Label>
                  <Input type="number" {...register("lta")} />
                </div>
                <div className="space-y-2">
                  <Label>Special Allowance</Label>
                  <Input type="number" {...register("specialAllowance")} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Deductions (Section 80)</h3>
              {watch("taxRegime") === "NEW" && (
                <div className="bg-amber-500/10 text-amber-600 p-3 rounded-md text-sm mb-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Most Chapter VI-A deductions (like 80C, 80D, HRA) are not applicable in the New Tax Regime. Only standard deduction of ₹50,000 applies.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>80C (EPF, LIC, ELSS) [Max 1.5L]</Label>
                  <Input type="number" {...register("investments80c")} disabled={watch("taxRegime") === "NEW"} />
                </div>
                <div className="space-y-2">
                  <Label>80D (Health Insurance) [Max 25k/50k]</Label>
                  <Input type="number" {...register("medical80d")} disabled={watch("taxRegime") === "NEW"} />
                </div>
                <div className="space-y-2">
                  <Label>80CCD(1B) (NPS) [Max 50k]</Label>
                  <Input type="number" {...register("nps80ccd")} disabled={watch("taxRegime") === "NEW"} />
                </div>
                <div className="space-y-2">
                  <Label>24(b) (Home Loan Interest) [Max 2L]</Label>
                  <Input type="number" {...register("homeLoanInterest24b")} disabled={watch("taxRegime") === "NEW"} />
                </div>
                <div className="space-y-2">
                  <Label>PF Deduction (Employee)</Label>
                  <Input type="number" {...register("pfDeduction")} disabled={watch("taxRegime") === "NEW"} />
                </div>
                <div className="space-y-2">
                  <Label>Professional Tax (PT)</Label>
                  <Input type="number" {...register("ptDeduction")} disabled={watch("taxRegime") === "NEW"} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {editing ? "Update" : "Save"} Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
