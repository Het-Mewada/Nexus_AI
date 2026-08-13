import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Tag, Search, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { categoryApi } from "@/services/api";
import { toast } from "sonner";
import type { Category } from "@/types";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color").optional(),
  icon: z.string().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;

const colorOptions = [
  "#f97316", "#ec4899", "#8b5cf6", "#06b6d4", "#64748b", "#eab308",
  "#3b82f6", "#ef4444", "#a855f7", "#10b981", "#14b8a6", "#f43f5e", "#6366f1", "#6b7280",
];

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [searchQuery, setSearchQuery] = useState("");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { color: "#6366f1", icon: "tag" },
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    select: (res) => res.data as Category[],
  });

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Category>) => categoryApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category created"); handleClose(); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => categoryApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category updated"); handleClose(); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category deleted"); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to delete"),
  });

  const handleClose = () => { setIsOpen(false); setEditing(null); setSelectedColor("#6366f1"); reset(); };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setValue("name", cat.name);
    setValue("color", cat.color);
    setValue("icon", cat.icon);
    setSelectedColor(cat.color);
    setIsOpen(true);
  };

  const onSubmit = (formData: CategoryForm) => {
    const payload = { ...formData, color: selectedColor };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Categories</h1>
            {categories && (
              <Badge variant="secondary" className="px-2.5 py-0.5 text-xs rounded-full font-medium">
                {categories.length} total
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">Organize and color-code your expense categories</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative w-full md:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Button onClick={() => setIsOpen(true)} size="sm" className="h-9 gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FolderOpen className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <h3 className="text-sm font-medium">No categories found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? `No category matching "${searchQuery}"` : "Get started by adding your first category."}
            </p>
            {searchQuery && (
              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          <AnimatePresence mode="popLayout">
            {filteredCategories.map((cat) => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className="group relative flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-border hover:shadow-sm transition-all duration-200 min-h-[64px]">
                  {/* Category Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: `${cat.color}18` }}
                    >
                      <Tag className="h-4.5 w-4.5" style={{ color: cat.color }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {cat.color}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions or Default Tag */}
                  <div className="flex items-center shrink-0">
                    {cat.isDefault ? (
                      <span className="text-[10px] font-semibold text-muted-foreground/70 bg-muted px-2 py-0.5 rounded uppercase tracking-wider">
                        Default
                      </span>
                    ) : (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(cat)}
                          title="Edit category"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDeleteDialog
                          title="Delete Category"
                          onConfirm={() => deleteMutation.mutate(cat.id)}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Delete category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </ConfirmDeleteDialog>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>Create a custom expense category to organize your finances</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category Name</Label>
              <Input placeholder="e.g. Subscriptions, Groceries" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color Palette</Label>
              <div className="flex flex-wrap gap-2 py-1">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`h-7 w-7 rounded-full transition-all ${
                      selectedColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Label className="text-xs text-muted-foreground">Custom Color:</Label>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent"
                />
                <span className="text-xs font-mono text-muted-foreground">{selectedColor}</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
