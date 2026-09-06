import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShieldAlert, Trash2, Search, CheckSquare, Square, RefreshCw,
  Lock, AlertTriangle, FileText, CheckCircle2, Wallet, Receipt,
  PieChart, Target, Calendar, CreditCard, Shield, TrendingUp, Building,
  FileCheck, Bell, Activity, Tag, Sparkles, Coins, Users
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { adminApi } from "@/services/api";
import { toast } from "sonner";

interface DomainDefinition {
  key: string;
  name: string;
  description: string;
  icon: any;
  protectedNotice?: string;
  group: "finance" | "planning" | "wealth" | "system";
}

const DOMAINS: DomainDefinition[] = [
  // Finance
  { key: "expenses", name: "Expenses", description: "Expense records & line items", icon: Receipt, protectedNotice: "Auto-synced expenses protected", group: "finance" },
  { key: "incomes", name: "Incomes", description: "Income deposits & entries", icon: Wallet, protectedNotice: "Auto-synced incomes protected", group: "finance" },
  { key: "salaryRecords", name: "Salary Records", description: "Monthly salary & payroll data", icon: FileText, protectedNotice: "Synced salary entries protected", group: "finance" },
  { key: "initialBalance", name: "Initial Balance", description: "User's starting account balance", icon: Coins, group: "finance" },
  
  // Planning
  { key: "budgets", name: "Budgets", description: "Category & overall budget limits", icon: PieChart, group: "planning" },
  { key: "goals", name: "Savings Goals", description: "Financial target goals & contributions", icon: Target, group: "planning" },
  { key: "bills", name: "Bills & Reminders", description: "Upcoming & paid bill entries", icon: Calendar, group: "planning" },
  { key: "subscriptions", name: "Subscriptions", description: "Recurring active subscriptions", icon: CreditCard, group: "planning" },
  
  // Wealth
  { key: "investments", name: "Investments", description: "Portfolio holdings & transactions", icon: TrendingUp, group: "wealth" },
  { key: "loans", name: "Loans & Debts", description: "Liabilities, EMIs, & loan records", icon: Building, group: "wealth" },
  { key: "insurances", name: "Insurances", description: "Insurance policies & renewal dates", icon: Shield, group: "wealth" },
  { key: "taxProfiles", name: "Tax Profiles", description: "Tax estimations & regime choices", icon: FileCheck, group: "wealth" },

  // System
  { key: "contacts", name: "Contacts & Addresses", description: "Personal address book contacts & addresses", icon: Users, protectedNotice: "Google Synced contacts protected", group: "system" },
  { key: "smartSavings", name: "Smart Savings", description: "Smart savings log entries", icon: Sparkles, group: "system" },
  { key: "notifications", name: "Notifications", description: "System & alert notifications", icon: Bell, group: "system" },
  { key: "auditLogs", name: "Audit Logs", description: "User activity audit history", icon: Activity, group: "system" },
  { key: "documents", name: "Documents", description: "Vault document records", icon: FileText, group: "system" },
  { key: "events", name: "Calendar Events", description: "Custom calendar events", icon: Calendar, group: "system" },
  { key: "customCategories", name: "Custom Categories", description: "User-created non-default categories", icon: Tag, group: "system" },
];

export default function DataClearPage() {
  const [targetEmail, setTargetEmail] = useState("");
  const [confirmEmailInput, setConfirmEmailInput] = useState("");
  const [selectedDomains, setSelectedDomains] = useState<Record<string, boolean>>({
    expenses: true,
    incomes: true,
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [includeSyncedContacts, setIncludeSyncedContacts] = useState(false);
  const [lastReport, setLastReport] = useState<any>(null);

  const clearMutation = useMutation({
    mutationFn: (data: { email: string; features: Record<string, boolean>; confirmDelete: boolean; confirmEmail?: string; includeSyncedContacts?: boolean }) =>
      adminApi.clearUserData(data),
    onSuccess: (res: any) => {
      const reportData = res.data?.report || res.report;
      setLastReport(reportData);
      if (reportData?.executed) {
        toast.success("User data successfully cleared.");
        setIsConfirmModalOpen(false);
        setConfirmEmailInput("");
      } else {
        toast.info("Dry run inspection report generated. Scroll down to view.");
      }
    },

    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Operation failed.");
    },
  });

  const toggleDomain = (key: string) => {
    setSelectedDomains((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectGroup = (group?: string) => {
    const updated = { ...selectedDomains };
    DOMAINS.forEach((d) => {
      if (!group) {
        updated[d.key] = true;
      } else if (d.group === group) {
        updated[d.key] = true;
      }
    });
    setSelectedDomains(updated);
  };

  const deselectAll = () => {
    const updated: Record<string, boolean> = {};
    DOMAINS.forEach((d) => (updated[d.key] = false));
    setSelectedDomains(updated);
  };

  const selectedCount = Object.values(selectedDomains).filter(Boolean).length;

  const handleDryRun = () => {
    if (!targetEmail.trim()) {
      toast.error("Please enter a target user email.");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Please select at least one data domain to inspect.");
      return;
    }
    clearMutation.mutate({
      email: targetEmail.trim(),
      features: selectedDomains,
      includeSyncedContacts,
      confirmDelete: false,
    });
  };

  const handleConfirmExecute = () => {
    if (confirmEmailInput.trim().toLowerCase() !== targetEmail.trim().toLowerCase()) {
      toast.error("Email confirmation does not match target email.");
      return;
    }
    clearMutation.mutate({
      email: targetEmail.trim(),
      features: selectedDomains,
      includeSyncedContacts,
      confirmDelete: true,
      confirmEmail: confirmEmailInput.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader

        title="Data Reset & Domain Purge"
        description="Safely clear selected user data domains while enforcing strict auto-synced protections."
      />


      {/* Target User Card */}
      <div className="rounded-[18px] border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Target User Selection
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Enter the exact account email to inspect or clear.</p>
          </div>
          <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-primary/5 text-primary border-primary/20 font-mono">
            <ShieldAlert className="h-3.5 w-3.5" /> Auto-Synced Protection Active
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="targetEmail" className="text-xs font-semibold">User Email Address</Label>
            <div className="relative">
              <Input
                id="targetEmail"
                type="email"
                placeholder="e.g. user@example.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="bg-secondary/40 font-mono text-sm pl-9"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />

            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={handleDryRun}
              disabled={clearMutation.isPending || !targetEmail.trim()}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${clearMutation.isPending ? "animate-spin" : ""}`} />
              Dry Run Inspection
            </Button>

            <Button
              variant="destructive"
              disabled={clearMutation.isPending || !targetEmail.trim() || selectedCount === 0}
              onClick={() => {
                if (!targetEmail.trim()) {
                  toast.error("Please enter target email");
                  return;
                }
                setIsConfirmModalOpen(true);
              }}
              className="gap-2 font-semibold shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Execute Purge ({selectedCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Domain Selection Matrix */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Selectable Data Domains</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedCount} of {DOMAINS.length} domains selected</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => selectGroup()} className="h-8 text-xs gap-1">
              <CheckSquare className="h-3.5 w-3.5" /> Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => selectGroup("finance")} className="h-8 text-xs gap-1">
              <Wallet className="h-3.5 w-3.5" /> Finance Only
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll} className="h-8 text-xs gap-1 text-muted-foreground">
              <Square className="h-3.5 w-3.5" /> Clear Selection
            </Button>
          </div>
        </div>

        {/* Domain Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((domain) => {
            const Icon = domain.icon;
            const isSelected = Boolean(selectedDomains[domain.key]);

            return (
              <motion.div
                key={domain.key}
                whileHover={{ scale: 1.01 }}
                onClick={() => toggleDomain(domain.key)}
                className={`group cursor-pointer rounded-[14px] border p-4 transition-all ${
                  isSelected
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-border/80 bg-card hover:bg-secondary/40 opacity-75"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleDomain(domain.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-sm font-bold truncate">{domain.name}</p>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {domain.description}
                    </p>

                    {domain.protectedNotice && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 rounded-md px-2 py-1 border border-emerald-500/20 w-fit">
                        <Lock className="h-3 w-3" />
                        <span>{domain.protectedNotice}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Execution / Dry Run Report Panel */}
      {lastReport && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[18px] border border-border/80 bg-card p-6 shadow-md space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                {lastReport.executed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <h3 className="text-lg font-bold">
                  {lastReport.executed ? "Execution Report" : "Dry Run Inspection Summary"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Account: <span className="text-foreground">{lastReport.user?.email}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-sm">
              <Badge variant="outline" className="px-3 py-1 bg-destructive/10 text-destructive border-destructive/30">
                {lastReport.totalDeleted} Deleted
              </Badge>
              <Badge variant="outline" className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                🛡️ {lastReport.totalProtected} Protected
              </Badge>
            </div>
          </div>

          {/* Results Table */}
          <div className="divide-y rounded-xl border border-border/60 bg-secondary/30 overflow-hidden text-xs">
            <div className="grid grid-cols-4 bg-secondary/70 p-3 font-bold text-muted-foreground uppercase tracking-wider">
              <span>Domain</span>
              <span>Requested</span>
              <span>Deleted Count</span>
              <span>Protected (Synced)</span>
            </div>
            {lastReport.results?.map((res: any) => (
              <div key={res.domain} className="grid grid-cols-4 p-3 items-center">
                <span className="font-semibold">{res.domain}</span>
                <span>
                  {res.requested ? (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      YES
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">NO</span>
                  )}
                </span>
                <span className="font-mono text-destructive font-semibold">
                  {res.deletedCount}
                </span>
                <span className="font-mono text-emerald-500">
                  {res.protectedCount > 0 ? `🛡️ ${res.protectedCount} skipped` : "0"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Security Confirmation Modal */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Confirm Data Purge
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              You are about to purge <span className="font-bold text-foreground">{selectedCount} data domains</span> for user{" "}
              <span className="font-bold font-mono text-destructive">{targetEmail}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 dark:text-amber-400 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Irreversible Operation
              </p>
              <p className="leading-relaxed">
                Non-synced data in selected domains will be deleted immediately. Auto-synced restricted records are protected and will be skipped unless explicitly requested below.
              </p>
            </div>

            {selectedDomains.contacts && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-foreground">
                  <Checkbox
                    checked={includeSyncedContacts}
                    onCheckedChange={(checked) => setIncludeSyncedContacts(Boolean(checked))}
                  />
                  <span>Delete Google Synced contacts as well?</span>
                </label>
                <p className="text-[11px] text-muted-foreground leading-normal pl-6">
                  Google Synced contacts are protected by default. Checking this option will permanently delete Google Synced contacts for this user as well.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Type <span className="font-mono font-bold text-foreground">{targetEmail}</span> to confirm:
              </Label>
              <Input
                type="email"
                placeholder="Enter user email to confirm"
                value={confirmEmailInput}
                onChange={(e) => setConfirmEmailInput(e.target.value)}
                className="bg-secondary/40 font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                clearMutation.isPending ||
                confirmEmailInput.trim().toLowerCase() !== targetEmail.trim().toLowerCase()
              }
              onClick={handleConfirmExecute}
              className="gap-2"
            >
              {clearMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              Confirm & Purge Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
