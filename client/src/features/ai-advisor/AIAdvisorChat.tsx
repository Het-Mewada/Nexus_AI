import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Loader2, Plus, MessageSquare, Trash2, MoreVertical, Pin, PinOff, Edit2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { conversationApi } from "@/services/api";
import type { AiConversation, AiMessage } from "@/types";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";

export default function AIAdvisorChat() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(searchParams.get("conversationId"));
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [renameDialog, setRenameDialog] = useState<{ isOpen: boolean, convId: string, currentTitle: string }>({ isOpen: false, convId: "", currentTitle: "" });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, convId: string }>({ isOpen: false, convId: "" });

  // 1. List conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversationApi.list,
  });

  // 2. Load active conversation
  const { data: activeConversation, isLoading: loadingMessages } = useQuery({
    queryKey: ["conversation", activeConversationId],
    queryFn: () => conversationApi.getById(activeConversationId!),
    enabled: !!activeConversationId,
  });

  // Auto-select first conversation if none selected, or reset if list is empty/deleted
  useEffect(() => {
    if (Array.isArray(conversations) && conversations.length > 0) {
      const exists = conversations.some((c: any) => c.id === activeConversationId);
      if (!activeConversationId || !exists) {
        const first = (conversations as any[])[0];
        if (first?.id) {
          setActiveConversationId(first.id);
        }
      }
    } else if (Array.isArray(conversations) && conversations.length === 0) {
      if (activeConversationId !== null) {
        setActiveConversationId(null);
      }
    }
  }, [conversations, activeConversationId]);

  // Sync URL with active conversation
  useEffect(() => {
    if (activeConversationId) {
      setSearchParams({ conversationId: activeConversationId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeConversationId, setSearchParams]);

  // Safety effect: Force cleanup of stuck Radix UI pointer-events and scroll locks
  useEffect(() => {
    const cleanup = () => {
      document.body.style.pointerEvents = "";
      document.body.removeAttribute("data-scroll-locked");
    };
    cleanup();
    const timer = setTimeout(cleanup, 150);
    return () => clearTimeout(timer);
  }, [deleteDialog.isOpen, renameDialog.isOpen, activeConversationId, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [(activeConversation as any)?.messages]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => conversationApi.create("New Conversation"),
    onSuccess: (newConv: any) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConversationId(newConv.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => conversationApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.removeQueries({ queryKey: ["conversation", deletedId] });

      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
      }

      toast.success("Conversation deleted");
    },
    onSettled: () => {
      document.body.style.pointerEvents = "";
      document.body.removeAttribute("data-scroll-locked");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; isPinned?: boolean } }) => conversationApi.updateConversation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ id, msg }: { id: string; msg: string }) => conversationApi.sendMessage(id, msg),
    onMutate: async ({ id, msg }) => {
      await queryClient.cancelQueries({ queryKey: ["conversation", id] });
      const previousConversation = queryClient.getQueryData(["conversation", id]);
      queryClient.setQueryData(["conversation", id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...(old.messages || []),
            { id: Date.now().toString(), role: "user", content: msg, createdAt: new Date().toISOString() }
          ]
        };
      });
      return { previousConversation };
    },
    onError: (err, newMsg, context) => {
      queryClient.setQueryData(["conversation", newMsg.id], context?.previousConversation);
      toast.error("Failed to send message");
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;

    if (!activeConversationId) {
      // If no conversation exists, create one first, then send
      createMutation.mutate(undefined, {
        onSuccess: (newConv: any) => {
          sendMutation.mutate({ id: newConv.id, msg: input });
          setInput("");
        }
      });
      return;
    }

    sendMutation.mutate({ id: activeConversationId, msg: input });
    setInput("");
  };

  const messages = ((activeConversation as any)?.messages || []).filter((msg: any) => msg.role !== "system");
  const showIntro = messages.length === 0 && !sendMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="AI Advisor" description="Ask questions, test decisions, and keep a running context of the conversations that matter." actions={<Button onClick={() => createMutation.mutate()} variant="gradient" disabled={createMutation.isPending}><Plus className="h-4 w-4" /> New chat</Button>} />
      <div className="grid h-[calc(100vh-17rem)] min-h-[520px] grid-cols-1 gap-5 md:grid-cols-[232px_minmax(0,1fr)]">
        {/* Sidebar - Conversations List */}
        <Card className="hidden flex-col overflow-hidden rounded-[16px] border-border/80 bg-card shadow-none md:flex">
          <div className="border-b border-border/80 px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Conversation history</p><p className="mt-1 text-xs text-muted-foreground">Your personal finance context</p></div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {loadingConversations ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (conversations as any[]).length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              (conversations as any[]).map((conv: any) => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between rounded-[9px] p-3 cursor-pointer transition-colors ${activeConversationId === conv.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                    }`}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate font-medium">{conv.title}</span>
                    {conv.isPinned && <Pin className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 !text-white hover:bg-white/10 hover:!text-white focus-visible:!text-white">
                          <MoreVertical className="h-4 w-4 text-white" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-background dark:border-border shadow-2xl">
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          onSelect={() => {
                            updateMutation.mutate({ id: conv.id, data: { isPinned: !conv.isPinned } });
                          }}
                        >
                          {conv.isPinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                          {conv.isPinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          onSelect={() => {
                            setTimeout(() => {
                              setRenameDialog({ isOpen: true, convId: conv.id, currentTitle: conv.title });
                            }, 50);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
                          onSelect={() => {
                            setTimeout(() => {
                              setDeleteDialog({ isOpen: true, convId: conv.id });
                            }, 50);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Main Chat Area */}
        {(!conversations || (conversations as any[]).length === 0) && !loadingConversations ? (
          <Card className="flex flex-1 flex-col items-center justify-center rounded-[16px] border-border/80 bg-card p-8 text-center shadow-none">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
              <MessageSquare className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-foreground">No conversations yet</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Start a new chat to get personalized financial advice, negotiate bills, or analyze your spending habits with Nexus AI.
            </p>
            <Button size="lg" variant="gradient" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
              Start New Chat
            </Button>
          </Card>
        ) : (
          <Card className="flex flex-1 flex-col overflow-hidden rounded-[16px] border-border/80 bg-card shadow-none">
            <div className="flex items-center gap-3 border-b border-border/80 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">AI Financial Advisor</h2>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Ready when you are</p>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
              {showIntro && (
                <div className="mx-auto flex w-full max-w-3xl items-center gap-4 rounded-[12px] border border-primary/20 bg-primary/[0.06] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
                    <Bot className="h-5 w-5" />
                  </div>
                  <p className="text-sm">Hello! I am your Nexus AI Financial Advisor. I have full context of your income, expenses, budgets, and investments. How can I help you today?</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg: any) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                        }`}
                    >
                      {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div
                      className={`flex max-w-[80%] flex-col gap-2 rounded-[14px] px-4 py-3 text-sm ${msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-[4px]"
                        : "bg-secondary text-foreground dark:bg-emerald-900/35 dark:border dark:border-emerald-500/25 dark:shadow-sm rounded-tl-[4px]"
                        }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/10 dark:prose-pre:bg-white/10 prose-pre:rounded-lg">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {sendMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 rounded-[14px] rounded-tl-[4px] bg-secondary dark:bg-emerald-900/35 dark:border dark:border-emerald-500/25 px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Analyzing your finances...</span>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex flex-col gap-2 border-t border-border/80 bg-background p-4">
              {activeConversation && activeConversation.title?.endsWith("Negotiation") && (
                <div className="max-w-4xl mx-auto w-full flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-muted/30 rounded-lg w-fit">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="font-medium truncate">{activeConversation.title}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-7 relative max-w-4xl mx-auto w-full">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Anything..."
                  className="border-border/80 bg-card pl-4 pr-12 py-6 rounded-[12px] shadow-none focus-visible:ring-primary"
                  disabled={sendMutation.isPending || loadingMessages}
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send"
                  disabled={!input.trim() || sendMutation.isPending || loadingMessages}
                  className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-[9px] hover:-translate-y-1/2"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialog.isOpen} onOpenChange={(open) => setRenameDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameDialog.currentTitle}
              onChange={(e) => setRenameDialog(prev => ({ ...prev, currentTitle: e.target.value }))}
              placeholder="Conversation Title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (renameDialog.currentTitle.trim()) {
                    updateMutation.mutate({ id: renameDialog.convId, data: { title: renameDialog.currentTitle.trim() } });
                    setRenameDialog({ isOpen: false, convId: "", currentTitle: "" });
                  }
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ isOpen: false, convId: "", currentTitle: "" })}>Cancel</Button>
            <Button
              onClick={() => {
                if (renameDialog.currentTitle.trim()) {
                  updateMutation.mutate({ id: renameDialog.convId, data: { title: renameDialog.currentTitle.trim() } });
                  setRenameDialog({ isOpen: false, convId: "", currentTitle: "" });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, convId: "" })}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate(deleteDialog.convId);
                setDeleteDialog({ isOpen: false, convId: "" });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
