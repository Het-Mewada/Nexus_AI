import { useState } from "react";
import { useLocalStorage, useDebounce } from "@/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Search, RefreshCw, Upload, X, ArrowUpDown, Lock, Tag, CalendarDays, LayoutGrid, List, Sparkles, Mic, Receipt, Filter } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { BalanceWarningCallout } from "@/components/ui/balance-warning-callout";
import { expenseApi, categoryApi } from "@/services/api";
import { cn, formatCurrency, formatDate, paymentMethods, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Expense, Category } from "@/types";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ActionTooltip } from "@/components/ui/tooltip";
import { VoiceExpenseModal } from "./VoiceExpenseModal";



const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  merchant: z.string().min(1, "Merchant is required").max(100, "Merchant name is too long"),
  date: z.string().min(1, "Date is required"),
  paymentMethod: z.string().optional(),
  notes: z.string().max(500, "Notes are too long").optional(),
  tags: z.string().max(255, "Tags are too long").optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const currencySymbol = currencies.find(c => c.value === user?.currency)?.symbol || "₹";
  const [search, setSearch] = useLocalStorage("exp_search", "");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useLocalStorage("exp_sortBy", "date");
  const [sortOrder, setSortOrder] = useLocalStorage<"asc" | "desc">("exp_sortOrder", "desc");
  const [filterCategory, setFilterCategory] = useLocalStorage("exp_filterCategory", "");
  const [filterTags, setFilterTags] = useLocalStorage("exp_filterTags", "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [viewMode, setViewMode] = useLocalStorage<"list" | "card">("exp_viewMode", "list");
  const [scanFile, setScanFile] = useState<File | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const debouncedTags = useDebounce(filterTags, 300);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { paymentMethod: "cash" },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    select: (res) => res.data as Category[],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", page, debouncedSearch, sortBy, sortOrder, filterCategory, debouncedTags],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), limit: "20", sortBy, sortOrder };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterCategory) params.categoryId = filterCategory;
      if (debouncedTags) params.tags = debouncedTags;
      return expenseApi.list(params);
    },
  });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => expenseApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense added");
      handleClose();
    },
    onError: () => toast.error("Failed to create expense"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => expenseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense updated");
      handleClose();
    },
    onError: () => toast.error("Failed to update expense"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense deleted");
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
    setReceiptFile(null);
    setScanFile(null);
    setActiveTab("manual");
    reset({ amount: 0, categoryId: "", merchant: "", date: "", paymentMethod: "cash", notes: "", tags: "" });
  };

  const handleEdit = (expense: Expense) => {
    setEditing(expense);
    setValue("amount", Number(expense.amount));
    setValue("categoryId", expense.categoryId);
    setValue("merchant", expense.merchant);
    setValue("date", expense.date.split("T")[0]!);
    setValue("paymentMethod", expense.paymentMethod);
    setValue("notes", expense.notes || "");
    setValue("tags", expense.tags.join(", "));
    setIsOpen(true);
  };

  const onSubmit = (formData: ExpenseForm) => {
    const fd = new FormData();
    fd.append("amount", String(formData.amount));
    fd.append("categoryId", formData.categoryId);
    fd.append("merchant", formData.merchant);
    fd.append("date", new Date(formData.date).toISOString());
    if (formData.paymentMethod) fd.append("paymentMethod", formData.paymentMethod);
    if (formData.notes) fd.append("notes", formData.notes);
    if (formData.tags) fd.append("tags", formData.tags);
    if (receiptFile) fd.append("receipt", receiptFile);

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: fd });
    } else {
      createMutation.mutate(fd);
    }
  };

  const scanMutation = useMutation({
    mutationFn: (formData: FormData) => expenseApi.scanReceipt(formData),
    onSuccess: (res) => {
      const data = res.data;
      if (data.amount) setValue("amount", data.amount);
      if (data.date) setValue("date", data.date);
      if (data.merchant) setValue("merchant", data.merchant);
      if (data.categoryId) setValue("categoryId", data.categoryId);
      if (data.paymentMethod) setValue("paymentMethod", data.paymentMethod);
      if (data.tags && data.tags.length > 0) setValue("tags", data.tags.join(", "));
      if (data.notes) setValue("notes", data.notes);

      setReceiptFile(scanFile);
      setScanFile(null);
      setActiveTab("manual");
      toast.success("✓ Receipt scanned successfully", {
        description: "We've extracted the expense details. Please review them before adding the expense."
      });
    },
    onError: () => toast.error("Unable to read this receipt", {
      description: "Please try a clearer image or enter the expense manually."
    }),
  });

  const handleScan = () => {
    if (!scanFile) return;
    const fd = new FormData();
    fd.append("receipt", scanFile);
    scanMutation.mutate(fd);
  };

  const expenses = (data?.data || []) as Expense[];
  const meta = data?.meta;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expenses"
        description="A clear record of where your money went, with enough context to act on it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsVoiceModalOpen(true)}
              variant="outline"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10 shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-primary" /> Voice Assistant
            </Button>
            <Button onClick={() => setIsOpen(true)} variant="gradient">
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          </div>
        }
      />


      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_250px]">
        <section className="min-w-0 space-y-5">
          <div className="rounded-[16px] border border-border/80 bg-card p-3 shadow-[0_1px_2px_hsl(155_20%_10%/0.03)]">
            <div className="grid gap-2 md:grid-cols-[minmax(180px,1.5fr)_minmax(160px,1fr)_150px_132px]">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input aria-label="Search expenses" placeholder="Search merchant or notes" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border-transparent bg-secondary/60 pl-10 focus:bg-card" />
              </div>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input aria-label="Filter by tags" placeholder="Filter by tags" value={filterTags} onChange={(e) => { setFilterTags(e.target.value); setPage(1); }} className="border-transparent bg-secondary/60 pl-10 focus:bg-card" />
              </div>
              <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="border-transparent bg-secondary/60"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All categories</SelectItem>{categories?.map((cat) => <SelectItem key={cat.id} value={cat.id}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}</span></SelectItem>)}</SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-between border-transparent bg-secondary/60 px-3 font-medium">
                    <span className="capitalize">{sortBy}</span>
                    <ArrowUpDown className="h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>


                <DropdownMenuContent className="w-44">
                  <DropdownMenuSub><DropdownMenuSubTrigger>Date</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent><DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("desc"); }}>Newest first</DropdownMenuItem><DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("asc"); }}>Oldest first</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub>
                  <DropdownMenuSub><DropdownMenuSubTrigger>Amount</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent><DropdownMenuItem onClick={() => { setSortBy("amount"); setSortOrder("desc"); }}>Highest first</DropdownMenuItem><DropdownMenuItem onClick={() => { setSortBy("amount"); setSortOrder("asc"); }}>Lowest first</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub>
                  <DropdownMenuSub><DropdownMenuSubTrigger>Merchant</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent><DropdownMenuItem onClick={() => { setSortBy("merchant"); setSortOrder("asc"); }}>A–Z</DropdownMenuItem><DropdownMenuItem onClick={() => { setSortBy("merchant"); setSortOrder("desc"); }}>Z–A</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <SectionHeading title="Recent activity" description={meta?.total ? `${meta.total} recorded expenses` : "Your latest spending activity"} />
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

          {isLoading ? (
            <div className="divide-y overflow-hidden rounded-[16px] border border-border/80 bg-card">{[...Array(5)].map((_, i) => <div key={i} className="flex animate-pulse items-center gap-4 p-5"><div className="h-10 w-10 rounded-[10px] bg-muted" /><div className="flex-1 space-y-2"><div className="h-3 w-1/3 rounded bg-muted" /><div className="h-3 w-1/4 rounded bg-muted" /></div><div className="h-4 w-20 rounded bg-muted" /></div>)}</div>
          ) : expenses.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[16px] border border-dashed border-border bg-card px-6 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] bg-primary/10 text-primary"><Receipt className="h-5 w-5" /></div><h3 className="text-lg font-bold">No expenses match this view</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Add your first expense or clear a filter to see activity here.</p><Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-5"><Plus className="h-4 w-4" /> Add expense</Button></div>
          ) : (
            <div className={cn(viewMode === "card" ? "grid gap-3 sm:grid-cols-3" : "divide-y overflow-hidden rounded-[16px] border border-border/80 bg-card")}>
              {expenses.map((expense, i) => (
                <motion.div key={expense.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035 }} className={cn("group flex gap-4 transition-colors hover:bg-secondary/35", viewMode === "card" ? "flex-col rounded-[16px] border border-border/80 bg-card p-4" : "flex-wrap items-center px-4 py-4 sm:px-5")}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]" style={{ backgroundColor: `${expense.category?.color || '#ef6c3c'}18` }}><Tag className="h-4 w-4" style={{ color: expense.category?.color || '#ef6c3c' }} /></div>
                    {viewMode === "card" && <span className="ml-auto font-mono text-sm font-semibold text-destructive">−{formatCurrency(Number(expense.amount))}</span>}
                  </div>

                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{expense.merchant}</p><Badge variant="outline" className="text-[10px]" style={{ borderColor: expense.category?.color, color: expense.category?.color }}>{expense.category?.name}</Badge>{expense.isAutoSynced && <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground"><Lock className="h-3 w-3" /> Synced</Badge>}</div><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(expense.date)} <span>·</span> {paymentMethods.find((m) => m.value === expense.paymentMethod)?.label || expense.paymentMethod}</p></div>
                  <div className={cn("flex items-center gap-2", viewMode === "card" ? "justify-end border-t border-border/70 pt-3" : "ml-auto")}>
                    <span className={cn("min-w-[96px] text-right font-mono text-sm font-medium text-destructive", viewMode === "card" && "hidden")}>
                      −{formatCurrency(Number(expense.amount))}
                    </span>
                    <div className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      {expense.isAutoSynced ? (
                        <ActionTooltip content="Auto-synced records cannot be edited directly">
                          <span className="inline-block cursor-not-allowed">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 pointer-events-none" disabled>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </span>
                        </ActionTooltip>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(expense)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {expense.isAutoSynced ? (
                        <ActionTooltip content="Auto-synced records cannot be deleted">
                          <span className="inline-block cursor-not-allowed">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 pointer-events-none" disabled>
                              <Lock className="h-4 w-4" />
                            </Button>
                          </span>
                        </ActionTooltip>
                      ) : (
                        <ConfirmDeleteDialog title="Delete Expense" onConfirm={() => deleteMutation.mutate(expense.id)}>
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
          {meta && meta.totalPages > 1 && <div className="flex items-center justify-center gap-3 pt-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="font-mono text-xs text-muted-foreground">{meta.page} / {meta.totalPages}</span><Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div>}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="rounded-[16px] border border-border/80 bg-primary p-5 text-primary-foreground"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground/60">This view</p><p className="mt-3 font-display text-4xl font-extrabold tracking-[-0.06em]">{meta?.total ?? expenses.length}</p><p className="mt-1 text-sm text-primary-foreground/70">expenses recorded</p><div className="mt-6 border-t border-primary-foreground/15 pt-4 text-xs text-primary-foreground/65">Use filters to narrow the list without losing your current sort.</div></div>
          <div className="rounded-[16px] border border-border/80 bg-card p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Quick note</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Receipts can be scanned from the add expense flow and reviewed before saving.</p><Button variant="link" className="mt-2 h-auto p-0 text-primary" onClick={() => { setActiveTab("scan"); setIsOpen(true); }}>Open scan flow <span aria-hidden="true">→</span></Button></div>

        </aside>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>{editing ? "Update expense details" : "Record a new expense"}</DialogDescription>
          </DialogHeader>

          <div className="w-full mt-2">
            {!editing && (
              <div className="mb-4 grid w-full grid-cols-2 rounded-[12px] border border-border/80 bg-secondary/60 p-1">
                <button type="button" onClick={() => setActiveTab("manual")} className={cn("rounded-[9px] px-2 py-2 text-xs sm:text-sm font-semibold transition-colors", activeTab === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Manual entry</button>
                <button type="button" onClick={() => setActiveTab("scan")} className={cn("rounded-[9px] px-2 py-2 text-xs sm:text-sm font-semibold transition-colors", activeTab === "scan" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Scan receipt</button>
              </div>
            )}



            {activeTab === "manual" && <div className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Merchant</Label>
                    <Input placeholder="e.g. Amazon, Swiggy" {...register("merchant")} />
                    {errors.merchant && <p className="text-xs text-destructive">{errors.merchant.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input placeholder="e.g. food, weekend, urgent" {...register("tags")} />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea placeholder="Add notes..." {...register("notes")} />
                </div>
                {/* Receipt Upload */}
                <div className="space-y-2">
                  <Label>Receipt (optional)</Label>
                  {receiptFile ? (
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{receiptFile.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReceiptFile(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById("receipt-input")?.click()}>
                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Click to upload receipt (JPEG, PNG, PDF — max 10MB)</p>
                    </div>
                  )}
                  <input id="receipt-input" type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                </div>
                <BalanceWarningCallout amount={watch("amount")} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editing ? "Update" : "Add"} Expense
                  </Button>
                </DialogFooter>
              </form>
            </div>}

            {activeTab === "scan" && <div className="space-y-4">
              <div className="text-center space-y-4 py-8">
                <p className="text-sm text-muted-foreground">
                  Upload a receipt and let AI extract the expense details automatically.
                </p>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById("scan-input")?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload receipt</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, PDF • Max 10MB</p>
                </div>
                <input
                  id="scan-input"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                />

                {scanFile && (
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50 text-left">
                    <Upload className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1 font-medium">{scanFile.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setScanFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="gradient"
                  onClick={handleScan}
                  disabled={!scanFile || scanMutation.isPending}
                >
                  {scanMutation.isPending ? "Analyzing receipt..." : "Scan Receipt"}
                </Button>
              </DialogFooter>
            </div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Voice Assistant / Natural Input Modal */}
      <VoiceExpenseModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />
    </div>
  );
}

