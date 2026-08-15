import { useState } from "react";
import { useLocalStorage, useDebounce } from "@/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, TrendingDown, Edit, Trash2, Search, RefreshCw, Upload, X, ArrowUpDown, Lock, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { BalanceWarningCallout } from "@/components/ui/balance-warning-callout";
import { expenseApi, categoryApi } from "@/services/api";
import { formatCurrency, formatDate, paymentMethods, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Expense, Category } from "@/types";

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track and manage your expenses</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient"><Plus className="h-4 w-4" /> Add Expense</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by merchant, notes..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filter by tags (comma separated)..." value={filterTags} onChange={(e) => { setFilterTags(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[130px] justify-between text-sm h-10 px-3 py-2 bg-background border border-input ring-offset-background hover:bg-accent hover:text-accent-foreground font-normal text-left">
                  <span className="capitalize">{sortBy}</span>
                  <ArrowUpDown className="h-4 w-4 opacity-50 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40">
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
                  <DropdownMenuSubTrigger>Merchant</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => { setSortBy("merchant"); setSortOrder("asc"); }}>A-Z</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy("merchant"); setSortOrder("desc"); }}>Z-A</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => (<Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>))}</div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingDown className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No expenses</h3>
            <p className="text-muted-foreground text-sm mt-1">Add your first expense to start tracking</p>
            <Button onClick={() => setIsOpen(true)} variant="gradient" className="mt-4"><Plus className="h-4 w-4" /> Add Expense</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense, i) => (
            <motion.div key={expense.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${expense.category?.color || '#6366f1'}15` }}>
                      <TrendingDown className="h-5 w-5" style={{ color: expense.category?.color || '#6366f1' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{expense.merchant}</p>
                        <Badge variant="outline" className="text-xs" style={{ borderColor: expense.category?.color, color: expense.category?.color }}>
                          {expense.category?.name}
                        </Badge>
                        {expense.isAutoSynced && (
                          <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-500 border-indigo-500/20 flex items-center gap-1 font-medium">
                            <Lock className="h-3 w-3" /> Auto-Synced
                          </Badge>
                        )}
                        {expense.tags.length > 0 && expense.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(expense.date)} · {paymentMethods.find((m) => m.value === expense.paymentMethod)?.label || expense.paymentMethod}</p>
                    </div>
                    <span className="text-lg font-bold text-rose-500">-{formatCurrency(Number(expense.amount))}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(expense)}
                        disabled={expense.isAutoSynced}
                        title={expense.isAutoSynced ? "Synced records cannot be edited directly" : "Edit"}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {expense.isAutoSynced ? (
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
                                This expense entry was automatically created from a shared group wallet deposit, bill, or subscription. Auto-synced entries cannot be deleted or modified directly from personal expenses.
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
                        <ConfirmDeleteDialog title="Delete Expense" onConfirm={() => deleteMutation.mutate(expense.id)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </ConfirmDeleteDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>{editing ? "Update expense details" : "Record a new expense"}</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
            {!editing && (
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="scan">Scan Receipt</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="manual" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="scan" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
