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

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!activeConversationId && (conversations as any[]).length > 0) {
      setActiveConversationId((conversations as any[])[0].id);
    }
  }, [conversations, activeConversationId]);

  // Sync URL with active conversation
  useEffect(() => {
    if (activeConversationId) {
      setSearchParams({ conversationId: activeConversationId }, { replace: true });
    }
  }, [activeConversationId, setSearchParams]);

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
      // Optimistically remove from cache so UI updates instantly
      queryClient.setQueryData(["conversations"], (old: any) => 
        old ? old.filter((c: any) => c.id !== deletedId) : []
      );
      
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
      }
      
      toast.success("Conversation deleted");
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
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar - Conversations List */}
      <Card className="w-64 hidden md:flex flex-col bg-card/50 backdrop-blur-md border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <Button
            onClick={() => createMutation.mutate()}
            className="w-full gap-2"
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : (conversations as any[]).length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet</div>
          ) : (
            (conversations as any[]).map((conv: any) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${activeConversationId === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                onClick={() => setActiveConversationId(conv.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate font-medium">{conv.title}</span>
                  {conv.isPinned && <Pin className="h-3 w-3 text-muted-foreground shrink-0" />}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted-foreground/10 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="dark:bg-background dark:border-border shadow-2xl">
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      onSelect={(e) => {
                        updateMutation.mutate({ id: conv.id, data: { isPinned: !conv.isPinned } });
                      }}
                    >
                      {conv.isPinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                      {conv.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      onSelect={(e) => {
                        setRenameDialog({ isOpen: true, convId: conv.id, currentTitle: conv.title });
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
                      onSelect={(e) => {
                        setDeleteDialog({ isOpen: true, convId: conv.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      {(!conversations || (conversations as any[]).length === 0) && !loadingConversations ? (
        <Card className="flex-1 flex flex-col items-center justify-center bg-card/50 backdrop-blur-md border-border shadow-xl p-8 text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-foreground">No conversations yet</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Start a new chat to get personalized financial advice, negotiate bills, or analyze your spending habits with Nexus AI.
          </p>
          <Button size="lg" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
            Start New Chat
          </Button>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden bg-card/50 backdrop-blur-md border-border shadow-xl">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Financial Advisor</h2>
            <p className="text-xs text-muted-foreground">Ask anything about your finances</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {showIntro && (
            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-2xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white">
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
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-purple-500 text-white"
                    }`}
                >
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`flex max-w-[80%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted rounded-tl-none"
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Analyzing your finances...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background/50 border-t border-border flex flex-col gap-2">
          {activeConversation && activeConversation.title?.endsWith("Negotiation") && (
            <div className="max-w-4xl mx-auto w-full flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-muted/30 rounded-lg w-fit">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="font-medium truncate">{activeConversation.title}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 relative max-w-4xl mx-auto w-full">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Anything..."
              className="pl-4 pr-12 py-6 rounded-full bg-background border-border/50 shadow-inner focus-visible:ring-primary"
              disabled={sendMutation.isPending || loadingMessages}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || sendMutation.isPending || loadingMessages}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
      )}

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
