import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Plus, Edit, Trash2, Search, ArrowUpDown, Lock, Wallet, CalendarDays,
  LayoutGrid, List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Switch } from "@/components/ui/switch";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ActionTooltip } from "@/components/ui/tooltip";


import { incomeApi } from "@/services/api";
import { formatCurrency, formatDate, currencies, cn } from "@/lib/utils";
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
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  
  const currencySymbol = currencies.find((c) => c.value === user?.currency)?.symbol || "₹";

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
    mutationFn: (formData: Partial<Income>) => incomeApi.create(formData),
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
    <div className="space-y-8">
      <PageHeader
        title="Income"
        description="A clear record of your earnings and inflows, organized by source."
        actions={
          <Button onClick={() => setIsOpen(true)} variant="gradient">
            <Plus className="h-4 w-4" /> Add Income
          </Button>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_250px]">
        <section className="min-w-0 space-y-5">
          {/* Search & Sort Filters */}
          <div className="rounded-[16px] border border-border/80 bg-card p-3 shadow-[0_1px_2px_hsl(155_20%_10%/0.03)]">
            <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_140px]">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  aria-label="Search income"
                  placeholder="Search source or notes..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="border-transparent bg-secondary/60 pl-10 focus:bg-card"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between border-transparent bg-secondary/60 px-3 font-medium">
                    <span className="capitalize">{sortBy}</span>
                    <ArrowUpDown className="h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-44">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Date</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("desc"); }}>Newest first</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("asc"); }}>Oldest first</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Amount</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => { setSortBy("amount"); setSortOrder("desc"); }}>Highest first</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSortBy("amount"); setSortOrder("asc"); }}>Lowest first</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Source</DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => { setSortBy("source"); setSortOrder("asc"); }}>A–Z</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSortBy("source"); setSortOrder("desc"); }}>Z–A</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Section Heading & View Mode Switch */}
          <div className="flex items-center justify-between gap-4">
            <SectionHeading title="Recent income" description={meta?.total ? `${meta.total} recorded inflows` : "Your latest income activity"} />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              aria-label={viewMode === "list" ? "Switch to card view" : "Switch to list view"}
              aria-pressed={viewMode === "card"}
              onClick={() => setViewMode(viewMode === "list" ? "card" : "list")}
            >
              {viewMode === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              <span className="hidden sm:inline">{viewMode === "list" ? "Card view" : "List view"}</span>
            </Button>
          </div>

          {/* Income Item List */}
          {isLoading ? (
            <div className="divide-y overflow-hidden rounded-[16px] border border-border/80 bg-card">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-4 p-5">
                  <div className="h-10 w-10 rounded-[11px] bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-1/4 rounded bg-muted" />
                  </div>
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : incomes.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-card px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] bg-emerald-500/10 text-emerald-500">
                <Wallet className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">No income records match this view</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Add your first income entry or adjust your search to see activity here.</p>
              <Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-5">
                <Plus className="h-4 w-4" /> Add Income
              </Button>
            </div>
          ) : (
            <div className={cn(viewMode === "card" ? "grid gap-3 sm:grid-cols-3" : "divide-y overflow-hidden rounded-[16px] border border-border/80 bg-card")}>
              {incomes.map((income, i) => (
                <motion.div
                  key={income.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.035 }}
                  className={cn(
                    "group flex gap-4 transition-colors hover:bg-secondary/35",
                    viewMode === "card" ? "flex-col rounded-[16px] border border-border/80 bg-card p-4" : "flex-wrap items-center px-4 py-4 sm:px-5"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-emerald-500/10 text-emerald-500">
                      <Wallet className="h-4 w-4 text-emerald-500" />
                    </div>
                    {viewMode === "card" && (
                      <span className="ml-auto font-mono text-sm font-medium text-emerald-500">
                        +{formatCurrency(Number(income.amount))}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{income.source}</p>
                      {income.isRecurring && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                          Recurring
                        </Badge>
                      )}
                      {income.isAutoSynced && (
                        <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                          <Lock className="h-3 w-3" /> Synced
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(income.date)}
                    </p>

                  </div>
                  <div className={cn("flex items-center gap-2", viewMode === "card" ? "justify-end border-t border-border/70 pt-3" : "ml-auto")}>
                    <span className={cn("min-w-[96px] text-right font-mono text-sm font-medium text-emerald-500", viewMode === "card" && "hidden")}>
                      +{formatCurrency(Number(income.amount))}
                    </span>
                    <div className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      {income.isAutoSynced ? (
                        <ActionTooltip content="Auto-synced records cannot be edited directly">
                          <span className="inline-block cursor-not-allowed">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 pointer-events-none" disabled>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </span>
                        </ActionTooltip>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(income)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {income.isAutoSynced ? (
                        <ActionTooltip content="Auto-synced records cannot be deleted">
                          <span className="inline-block cursor-not-allowed">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 pointer-events-none" disabled>
                              <Lock className="h-4 w-4" />
                            </Button>
                          </span>
                        </ActionTooltip>
                      ) : (
                        <ConfirmDeleteDialog title="Delete Income" onConfirm={() => deleteMutation.mutate(income.id)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDeleteDialog>
                      )}
                    </div>

                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                {meta.page} / {meta.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="rounded-[16px] border border-border/80 bg-primary p-5 text-primary-foreground">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground/60">This view</p>
            <p className="mt-3 font-display text-4xl font-extrabold tracking-[-0.06em]">{meta?.total ?? incomes.length}</p>
            <p className="mt-1 text-sm text-primary-foreground/70">inflow records</p>
            <div className="mt-6 border-t border-primary-foreground/15 pt-4 text-xs text-primary-foreground/65">
              Track recurring salary, freelance work, or custom deposits cleanly.
            </div>
          </div>

          <div className="rounded-[16px] border border-border/80 bg-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Quick note</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Setting up recurring income helps calculate monthly cash flow projections accurately.
            </p>
            <Button variant="link" className="mt-2 h-auto p-0 text-primary" onClick={() => setIsOpen(true)}>
              Open add flow <span aria-hidden="true">→</span>
            </Button>
          </div>

        </aside>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Income" : "Add Income"}</DialogTitle>
            <DialogDescription>{editing ? "Update income details" : "Record a new income entry"}</DialogDescription>
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
              <Textarea placeholder="Add notes..." {...register("notes")} className="min-h-[70px] resize-none" />
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
