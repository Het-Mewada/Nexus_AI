import { useState } from "react";
import { useLocalStorage, useDebounce } from "@/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, TrendingDown, Edit, Trash2, Search, RefreshCw, Upload, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { expenseApi, categoryApi } from "@/services/api";
import { formatCurrency, formatDate, paymentMethods } from "@/lib/utils";
import { toast } from "sonner";
import type { Expense, Category } from "@/types";

const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  merchant: z.string().min(1, "Merchant is required"),
  date: z.string().min(1, "Date is required"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useLocalStorage("exp_search", "");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useLocalStorage("exp_sortBy", "date");
  const [sortOrder, setSortOrder] = useLocalStorage<"asc" | "desc">("exp_sortOrder", "desc");
  const [filterCategory, setFilterCategory] = useLocalStorage("exp_filterCategory", "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { paymentMethod: "cash" },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    select: (res) => res.data as Category[],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", page, debouncedSearch, sortBy, sortOrder, filterCategory],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), limit: "20", sortBy, sortOrder };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterCategory) params.categoryId = filterCategory;
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
              <Input placeholder="Search by merchant, notes, tags..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="merchant">Merchant</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
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
                        {expense.tags.length > 0 && expense.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(expense.date)} · {paymentMethods.find((m) => m.value === expense.paymentMethod)?.label || expense.paymentMethod}</p>
                    </div>
                    <span className="text-lg font-bold text-rose-500">-{formatCurrency(Number(expense.amount))}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(expense)}><Edit className="h-4 w-4" /></Button>
                      <ConfirmDeleteDialog title="Delete Expense" onConfirm={() => deleteMutation.mutate(expense.id)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </ConfirmDeleteDialog>
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...register("date")} />
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
                <Select onValueChange={(v) => setValue("categoryId", v)}>
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
              <Select onValueChange={(v) => setValue("paymentMethod", v)} defaultValue="cash">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Add"} Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
