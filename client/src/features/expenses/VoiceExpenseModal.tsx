import { useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi, expenseApi, categoryApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import type { Category, ExtractedVoiceExpense } from "@/types";
import { paymentMethods, currencies, cn, formatCurrency } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  ArrowRight,
  HelpCircle,
  Tag,
  CalendarDays,
  CreditCard,
  Store,
  DollarSign,
  FileText,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BalanceWarningCallout } from "@/components/ui/balance-warning-callout";

interface VoiceExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VoiceExpenseModal({ isOpen, onClose, onSuccess }: VoiceExpenseModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currencySymbol = currencies.find((c) => c.value === user?.currency)?.symbol || "₹";

  const {
    isSupported,
    isListening,
    isTranscribing,
    transcript,
    interimTranscript,
    error: sttError,
    provider: sttProvider,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  } = useSpeechRecognition({ lang: "en-IN", preferDeepgram: true });


  const [extractedData, setExtractedData] = useState<ExtractedVoiceExpense | null>(null);

  // Editable Form State (populated from extracted data)
  const [editedAmount, setEditedAmount] = useState<string>("");
  const [editedCategoryId, setEditedCategoryId] = useState<string>("");
  const [editedMerchant, setEditedMerchant] = useState<string>("");
  const [editedDate, setEditedDate] = useState<string>("");
  const [editedPaymentMethod, setEditedPaymentMethod] = useState<string>("cash");
  const [editedNotes, setEditedNotes] = useState<string>("");
  const [editedTags, setEditedTags] = useState<string>("");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    select: (res) => res.data as Category[],
  });

  // LLM Voice Parsing Mutation
  const parseMutation = useMutation({
    mutationFn: (text: string) => aiApi.parseVoiceExpense(text, user?.timezone),
    onSuccess: (res) => {
      const data = res.data;
      setExtractedData(data);

      // Populate editable state
      const amountVal = data.fields.amount?.value;
      setEditedAmount(amountVal !== null && amountVal !== undefined ? String(amountVal) : "");

      const matchedCatId = data.fields.categoryId?.value;
      if (matchedCatId) {
        setEditedCategoryId(matchedCatId);
      } else if (data.fields.category?.value && categories) {
        const catObj = categories.find(
          (c) => c.name.toLowerCase() === data.fields.category.value?.toLowerCase()
        );
        setEditedCategoryId(catObj ? catObj.id : "");
      } else {
        setEditedCategoryId("");
      }

      setEditedMerchant(data.fields.merchant?.value || "");
      setEditedDate(data.fields.date?.value || new Date().toISOString().split("T")[0]!);
      setEditedPaymentMethod(data.fields.payment_method?.value || "cash");
      setEditedNotes(data.fields.notes?.value || data.fields.description?.value || "");
      setEditedTags("");

      toast.success("Extraction complete", {
        description: "Review what was understood before confirming.",
      });
    },
    onError: (err: any) => {
      toast.error("Parsing failed", {
        description: err?.response?.data?.error?.message || "Could not process speech. You can edit manually or try again.",
      });
    },
  });

  // Expense Creation Mutation (Triggered ONLY on explicit confirmation)
  const createMutation = useMutation({
    mutationFn: (fd: FormData) => expenseApi.create(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense successfully added!");
      handleResetAll();
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: () => {
      toast.error("Failed to add expense. Please check your form values.");
    },
  });

  const handleStartRecording = () => {
    resetTranscript();
    setExtractedData(null);
    startListening();
  };

  const handleStopRecording = () => {
    stopListening();
  };

  const handleParse = (textToParse?: string) => {
    const text = (textToParse || transcript || interimTranscript).trim();
    if (!text) {
      toast.error("Please speak or type an expense statement first.");
      return;
    }
    stopListening();
    parseMutation.mutate(text);
  };

  const handleResetAll = () => {
    stopListening();
    resetTranscript();
    setExtractedData(null);
    setEditedAmount("");
    setEditedCategoryId("");
    setEditedMerchant("");
    setEditedDate("");
    setEditedPaymentMethod("cash");
    setEditedNotes("");
    setEditedTags("");
  };

  const handleConfirmSave = () => {
    const numAmount = parseFloat(editedAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    if (!editedCategoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!editedMerchant.trim()) {
      toast.error("Please enter a merchant or vendor name");
      return;
    }
    if (!editedDate) {
      toast.error("Please select a date");
      return;
    }

    const fd = new FormData();
    fd.append("amount", String(numAmount));
    fd.append("categoryId", editedCategoryId);
    fd.append("merchant", editedMerchant.trim());
    fd.append("date", new Date(editedDate).toISOString());
    fd.append("paymentMethod", editedPaymentMethod || "cash");
    if (editedNotes.trim()) fd.append("notes", editedNotes.trim());
    if (editedTags.trim()) fd.append("tags", editedTags.trim());

    createMutation.mutate(fd);
  };

  const getConfidenceBadge = (confidence: number = 0, source?: string) => {
    const pct = Math.round(confidence * 100);
    if (source === "missing" || confidence === 0) {
      return <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-[10px]">Not detected</Badge>;
    }
    if (pct >= 90) {
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-mono text-[10px]">{pct}% confident ({source})</Badge>;
    }
    if (pct >= 70) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-mono text-[10px]">{pct}% confident ({source})</Badge>;
    }
    return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 font-mono text-[10px]">{pct}% confident ({source})</Badge>;
  };

  const samplePhrases = [
    "I spent 500 rupees on dinner.",
    "Paid ₹1,250 for groceries at D-Mart yesterday.",
    "Spent 800 on fuel using HDFC credit card.",
    "I paid 450 for lunch today through UPI.",
    "Add an expense of 999 for Netflix."
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleResetAll(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            Voice Assistant & Natural Input
          </DialogTitle>
          <DialogDescription>
            Speak or type an expense in natural language. Review extracted details with confidence scoring before confirming.
          </DialogDescription>
        </DialogHeader>

        {/* SECTION 1: Voice Recording & Natural Text Input */}
        <div className="space-y-5 py-2">
          {!extractedData && (
            <div className="space-y-4">
              <div className="relative rounded-2xl border border-border/80 bg-secondary/30 p-6 text-center shadow-inner">
                {isTranscribing ? (
                  <div className="space-y-4">
                    <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                      <Sparkles className="h-10 w-10 text-primary animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">Transcribing with Deepgram Nova-2...</p>
                      <p className="text-xs text-muted-foreground mt-1">Processing recorded audio via high-accuracy AI engine.</p>
                    </div>
                  </div>
                ) : isListening ? (
                  <div className="space-y-4">
                    <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 rounded-full bg-primary/20"
                      />
                      <Mic className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary flex items-center justify-center gap-1.5">
                        Recording HD Audio...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Speak clearly. When finished, click Stop Recording to transcribe with Deepgram AI.</p>
                    </div>

                    <Button variant="destructive" size="sm" onClick={handleStopRecording} className="gap-2">
                      <MicOff className="h-4 w-4" /> Stop Recording
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="group relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
                    >
                      <Mic className="h-9 w-9 transition-transform group-hover:scale-110" />
                    </button>
                    <div>
                      <p className="text-sm font-semibold flex items-center justify-center gap-2">
                        Click microphone to speak
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Powered by Deepgram Nova-2 AI Speech Recognition</p>
                    </div>
                  </div>
                )}

                {sttError && (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 p-3 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{sttError}</span>
                  </div>
                )}
              </div>


              {/* Natural Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Spoken / Typed Statement
                  </Label>
                  {(transcript || interimTranscript) && (
                    <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={resetTranscript}>
                      Clear text
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="e.g. Spent 750 rupees on dinner yesterday via UPI..."
                  value={transcript + (interimTranscript ? ` ${interimTranscript}` : "")}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="min-h-[90px] resize-none text-sm leading-relaxed"
                />
              </div>

              {/* Sample Quick Prompts */}
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground">Try saying or clicking:</p>
                <div className="flex flex-wrap gap-1.5">
                  {samplePhrases.map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTranscript(phrase);
                        handleParse(phrase);
                      }}
                      className="rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
                    >
                      "{phrase}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  disabled={parseMutation.isPending || (!transcript.trim() && !interimTranscript.trim())}
                  onClick={() => handleParse()}
                  className="gap-2"
                >
                  {parseMutation.isPending ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" /> Understanding your expense...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Extract Expense Details
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* SECTION 2: Structured Review UI ("Here's what I understood") */}
          {extractedData && (
            <div className="space-y-6">
              {/* Overall Confidence Callout */}
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Here's what I understood</h4>
                    <p className="text-xs text-muted-foreground">
                      Review all extracted values. You can edit any field before explicit confirmation.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-muted-foreground block">Overall Confidence</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-xs font-bold",
                      extractedData.overall_confidence >= 0.9
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : extractedData.overall_confidence >= 0.7
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                    )}
                  >
                    {Math.round(extractedData.overall_confidence * 100)}%
                  </Badge>
                </div>
              </div>

              {/* Original Transcript Reference */}
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Original Utterance: </span>
                "{extractedData.raw_transcript}"
              </div>

              {/* Editable Fields Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Amount */}
                <div className="space-y-1.5 rounded-xl border p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> Amount ({currencySymbol})
                    </Label>
                    {getConfidenceBadge(extractedData.fields.amount.confidence, extractedData.fields.amount.source)}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editedAmount}
                    onChange={(e) => setEditedAmount(e.target.value)}
                    className="font-mono text-base font-bold text-destructive"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5 rounded-xl border p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Category
                    </Label>
                    {getConfidenceBadge(extractedData.fields.category.confidence, extractedData.fields.category.source)}
                  </div>
                  <Select value={editedCategoryId} onValueChange={setEditedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
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
                </div>

                {/* Merchant */}
                <div className="space-y-1.5 rounded-xl border p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold">
                      <Store className="h-3.5 w-3.5 text-muted-foreground" /> Merchant / Vendor
                    </Label>
                    {getConfidenceBadge(extractedData.fields.merchant.confidence, extractedData.fields.merchant.source)}
                  </div>
                  <Input
                    placeholder="e.g. Starbucks, D-Mart, Swiggy"
                    value={editedMerchant}
                    onChange={(e) => setEditedMerchant(e.target.value)}
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5 rounded-xl border p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Transaction Date
                    </Label>
                    {getConfidenceBadge(extractedData.fields.date.confidence, extractedData.fields.date.source)}
                  </div>
                  <Input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5 rounded-xl border p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Payment Method
                    </Label>
                    {getConfidenceBadge(extractedData.fields.payment_method.confidence, extractedData.fields.payment_method.source)}
                  </div>
                  <Select value={editedPaymentMethod} onValueChange={setEditedPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-1.5 rounded-xl border p-3 bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Tags (optional)
                    </Label>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Optional</Badge>
                  </div>
                  <Input
                    placeholder="e.g. dinner, weekend, work"
                    value={editedTags}
                    onChange={(e) => setEditedTags(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5 rounded-xl border p-3 bg-card">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Description & Notes
                  </Label>
                  {getConfidenceBadge(extractedData.fields.notes.confidence || extractedData.fields.description.confidence, "explicit")}
                </div>
                <Textarea
                  placeholder="Add notes or description..."
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                />
              </div>

              <BalanceWarningCallout amount={parseFloat(editedAmount) || 0} />

              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
                <Button variant="outline" onClick={handleResetAll} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Start Over / Re-record
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="gradient"
                    onClick={handleConfirmSave}
                    disabled={createMutation.isPending}
                    className="gap-2 font-semibold shadow-md"
                  >
                    {createMutation.isPending ? (
                      "Saving Transaction..."
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Confirm & Add Expense
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
