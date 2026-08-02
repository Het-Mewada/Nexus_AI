import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddSmartSaving } from "../api";
import { useQuery } from "@tanstack/react-query";
import { categoryApi } from "@/services/api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, currencies } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface AddSmartSavingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddSmartSavingModal({ isOpen, onClose }: AddSmartSavingModalProps) {
  const [step, setStep] = useState(1);
  const [actualPurchaseWanted, setWanted] = useState("");
  const [expectedCost, setExpectedCost] = useState("");
  const [actualPurchase, setActual] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [decisionReason, setReason] = useState("");
  const [mood, setMood] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [description, setDescription] = useState("");

  const { user } = useAuth();
  const currencySymbol = currencies.find(c => c.value === (user?.currency || 'INR'))?.symbol || '₹';

  const addMutation = useAddSmartSaving();
  
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
  });
  const categories = categoriesData?.data || [];

  const savedAmount = (Number(expectedCost) || 0) - (Number(actualCost) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savedAmount < 0) {
      toast.error("Actual cost cannot exceed expected cost.");
      return;
    }
    
    await addMutation.mutateAsync({
      actualPurchaseWanted,
      expectedCost: Number(expectedCost),
      actualPurchase,
      actualCost: Number(actualCost),
      categoryId,
      decisionReason,
      mood,
      difficulty,
      description
    });
    
    toast.success("Smart Saving logged! Awesome job resisting temptation.");
    onClose();
    reset();
  };

  const reset = () => {
    setStep(1);
    setWanted("");
    setExpectedCost("");
    setActual("");
    setActualCost("");
    setCategoryId("");
    setReason("");
    setMood("");
    setDifficulty("");
    setDescription("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-card rounded-xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PiggyBank className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Log Smart Saving</h2>
              <p className="text-sm text-muted-foreground">Record money you intentionally didn't spend.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label>What did you WANT to buy?</Label>
                  <Input 
                    placeholder="e.g. Starbucks Coffee, Nike Shoes" 
                    value={actualPurchaseWanted}
                    onChange={e => setWanted(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Expected Cost</Label>
                  <Input 
                    type="number"
                    placeholder="₹650" 
                    value={expectedCost}
                    onChange={e => setExpectedCost(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>
                </div>
                <div className="pt-4 border-t">
                  <Label>What did you ACTUALLY do?</Label>
                  <Input 
                    placeholder="e.g. Made Tea at home, Skipped purchase" 
                    value={actualPurchase}
                    onChange={e => setActual(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Actual Cost</Label>
                  <Input 
                    type="number"
                    placeholder="₹50 (or 0 if skipped)" 
                    value={actualCost}
                    onChange={e => setActualCost(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Please enter amount in {user?.currency || 'INR'} ({currencySymbol})</p>
                </div>

                {savedAmount > 0 && (
                  <div className="p-4 bg-success/10 text-success rounded-lg flex items-center justify-between">
                    <span className="font-medium">You saved:</span>
                    <span className="text-xl font-bold">₹{savedAmount}</span>
                  </div>
                )}

                <Button type="button" className="w-full mt-4" onClick={() => setStep(2)} disabled={!actualPurchaseWanted || !expectedCost || !actualPurchase || !actualCost || savedAmount < 0}>
                  Next Step
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Reason for not spending</Label>
                  <Select value={decisionReason} onValueChange={setReason} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Why did you resist?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Impulse Control">Impulse Control</SelectItem>
                      <SelectItem value="Saving Goal">Saving Goal</SelectItem>
                      <SelectItem value="Too Expensive">Too Expensive</SelectItem>
                      <SelectItem value="Already Own Similar">Already Own Similar</SelectItem>
                      <SelectItem value="Waiting for Sale">Waiting for Sale</SelectItem>
                      <SelectItem value="Financial Discipline">Financial Discipline</SelectItem>
                      <SelectItem value="No Need">No Need</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Your Mood Before</Label>
                    <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger><SelectValue placeholder="Mood" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Happy">Happy</SelectItem>
                        <SelectItem value="Sad">Sad</SelectItem>
                        <SelectItem value="Stressed">Stressed</SelectItem>
                        <SelectItem value="Bored">Bored</SelectItem>
                        <SelectItem value="Hungry">Hungry</SelectItem>
                        <SelectItem value="Peer Pressure">Peer Pressure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Difficulty to Resist</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                        <SelectItem value="Very Hard">Very Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea 
                    placeholder="e.g. Really wanted pizza, but decided to stick to my goals."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button type="submit" className="flex-1" disabled={!categoryId || !decisionReason || addMutation.isPending}>
                    {addMutation.isPending ? "Saving..." : "Log Victory"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}
