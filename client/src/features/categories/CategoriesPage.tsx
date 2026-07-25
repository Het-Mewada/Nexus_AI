import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
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

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { color: "#6366f1", icon: "tag" },
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    select: (res) => res.data as Category[],
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage expense categories</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient"><Plus className="h-4 w-4" /> Add Category</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map((cat, i) => (
            <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: cat.color }} />
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}15` }}>
                      <Tag className="h-5 w-5" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg">{cat.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-muted-foreground">{cat.color}</span>
                        {cat.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                      </div>
                    </div>
                    {!cat.isDefault && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cat)}><Edit className="h-4 w-4" /></Button>
                        <ConfirmDeleteDialog title="Delete Category" onConfirm={() => deleteMutation.mutate(cat.id)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </ConfirmDeleteDialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>Create a custom expense category</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input placeholder="e.g. Subscriptions" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button key={color} type="button" onClick={() => setSelectedColor(color)} className={`h-8 w-8 rounded-full transition-all ${selectedColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"}`} style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs">Custom:</Label>
                <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded" />
                <span className="text-xs text-muted-foreground">{selectedColor}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Create"} Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
