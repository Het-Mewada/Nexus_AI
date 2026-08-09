import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemApi, adminApi } from "@/services/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, ShieldBan, ShieldCheck } from "lucide-react";

// Structure of features as they appear in the navigation
const FEATURE_GROUPS = [
  {
    label: "Main",
    isCore: true,
    items: [
      { name: "Dashboard" },
      { name: "Analytics" },
      { name: "Nexus Advisor" },
      { name: "Nexus Agent" },
      { name: "Notifications" }
    ]
  },
  {
    label: "Finance",
    items: [
      { name: "Income" },
      { name: "Expenses" },
      { name: "Salary" },
      { name: "Categories" }
    ]
  },
  {
    label: "Planning",
    items: [
      { name: "Budgets" },
      { name: "Smart Savings" },
      { name: "Calendar" },
      { name: "Goals" },
      { name: "Nexus Coach" },
      { name: "Tax Planning" }
    ]
  },
  {
    label: "Obligations",
    items: [
      { name: "Bills" },
      { name: "Subscriptions" },
      { name: "Liabilities" }
    ]
  },
  {
    label: "Personal",
    items: [
      { name: "Portfolio" },
      { name: "Family" },
      { name: "Address Book" },
      { name: "Documents" }
    ]
  }
];

import { useEffect } from "react";

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const [localFeatures, setLocalFeatures] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["systemFeatures"],
    queryFn: systemApi.getFeatures
  });

  useEffect(() => {
    if (data?.data?.features) {
      setLocalFeatures(data.data.features);
    }
  }, [data]);

  const { mutate: updateFeatures, isPending } = useMutation({
    mutationFn: adminApi.updateSystemFeatures,
    onSuccess: () => {
      toast.success("Feature flags updated successfully");
      queryClient.invalidateQueries({ queryKey: ["systemFeatures"] });
    },
    onError: () => {
      toast.error("Failed to update feature flags");
    }
  });

  const handleToggle = (key: string, value: string) => {
    setLocalFeatures(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    updateFeatures(localFeatures);
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Control which features are accessible to users. Disable features to show a restricted message, or hide them completely from the sidebar.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending} className="shrink-0">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURE_GROUPS.map((group) => {
          const groupKey = group.label;
          const groupState = localFeatures[groupKey] || "ENABLED";
          const isCore = group.isCore;

          return (
            <Card key={groupKey} className="flex flex-col">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.label}</CardTitle>
                    {isCore && <CardDescription className="text-xs mt-1">Core Group</CardDescription>}
                  </div>
                  {!isCore && (
                    <Select
                      value={groupState}
                      onValueChange={(val) => handleToggle(groupKey, val)}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENABLED">
                          <span className="flex items-center text-green-500"><ShieldCheck className="w-3 h-3 mr-2" /> Enabled</span>
                        </SelectItem>
                        <SelectItem value="DISABLED">
                          <span className="flex items-center text-amber-500"><ShieldBan className="w-3 h-3 mr-2" /> Disabled</span>
                        </SelectItem>
                        <SelectItem value="HIDDEN">
                          <span className="flex items-center text-red-500"><ShieldBan className="w-3 h-3 mr-2" /> Hidden</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <div className="space-y-4">
                  {group.items.map((item) => {
                    const itemKey = `${group.label}_${item.name}`;
                    const itemState = localFeatures[itemKey] || "ENABLED";
                    // If the group is completely hidden/disabled, we might want to reflect that visually, 
                    // but we still let them configure the individual item.
                    const isEffectivelyDisabled = groupState !== "ENABLED";
                    const isMainDashboard = group.isCore && item.name === "Dashboard";

                    return (
                      <div key={item.name} className="flex items-center justify-between">
                        <Label className={`font-medium ${isEffectivelyDisabled ? 'opacity-50' : ''}`}>
                          {item.name}
                        </Label>
                        
                        {isMainDashboard ? (
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Core / Cannot Disable</span>
                        ) : (
                          <Select
                            value={itemState}
                            onValueChange={(val) => handleToggle(itemKey, val)}
                          >
                            <SelectTrigger className="w-[110px] h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ENABLED">Enabled</SelectItem>
                              <SelectItem value="DISABLED">Disabled</SelectItem>
                              <SelectItem value="HIDDEN">Hidden</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
