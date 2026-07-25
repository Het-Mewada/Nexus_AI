import { useState } from "react";
import { Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartSavingsDashboard } from "./components/SmartSavingsDashboard";
import { SmartSavingsInsights } from "./components/SmartSavingsInsights";
import { SmartSavingsAchievements } from "./components/SmartSavingsAchievements";
import { AddSmartSavingModal } from "./components/AddSmartSavingModal";

export default function SmartSavingsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Savings Engine</h1>
          <p className="text-muted-foreground mt-1">Track money intentionally NOT spent to measure your financial discipline.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Log Smart Decision
        </Button>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-4 items-start">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h5 className="text-primary font-semibold mb-1">What is a Smart Saving?</h5>
          <p className="text-muted-foreground text-sm">
            This is not your bank balance. A Smart Saving is when you <strong>want</strong> to spend money, but intentionally choose not to (e.g., skipping a ₹350 cafe coffee and having tea at home for ₹50). You saved ₹300!
          </p>
        </div>
      </div>

      <SmartSavingsDashboard />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SmartSavingsAchievements />
        </div>
        <div>
          <SmartSavingsInsights />
        </div>
      </div>

      <AddSmartSavingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
