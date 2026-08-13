import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { feedbackApi, adminApi } from "@/services/api";
import { Feedback, FeedbackReply } from "@/types";
import { useAuth } from "@/context/AuthContext";

export function FeedbackThread({ feedback, isAdmin = false }: { feedback: Feedback; isAdmin?: boolean }) {
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const replyMutation = useMutation({
    mutationFn: (message: string) => {
      return isAdmin 
        ? adminApi.replyToFeedback(feedback.id, message) 
        : feedbackApi.reply(feedback.id, message);
    },
    onSuccess: () => {
      toast.success("Reply sent!");
      setReply("");
      queryClient.invalidateQueries({ queryKey: isAdmin ? ["adminFeedbacks"] : ["feedbacks"] });
    },
    onError: (error: any) => {
      const serverMessage = error.response?.data?.error?.message 
        || (typeof error.response?.data?.error === "string" ? error.response.data.error : null)
        || error.message 
        || "Failed to send reply";
      toast.error(serverMessage);
      queryClient.invalidateQueries({ queryKey: isAdmin ? ["adminFeedbacks"] : ["feedbacks"] });
    }
  });

  const isLocked = feedback.status === "RESOLVED" || feedback.status === "REJECTED";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || isLocked) return;
    replyMutation.mutate(reply);
  };

  return (
    <div className="mt-6 border-t pt-4 space-y-4">
      <h4 className="text-sm font-semibold mb-4">Conversation</h4>
      
      {feedback.replies && feedback.replies.length > 0 ? (
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {feedback.replies.map((r: FeedbackReply) => {
            const isMe = r.userId === user?.id;
            const isStaff = r.user?.role === "ADMIN" || r.user?.role === "SUPPORT";
            return (
              <div key={r.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={isStaff ? "bg-primary text-primary-foreground" : ""}>
                    {r.user?.name?.charAt(0) || r.user?.email.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[80%]`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {isMe ? "You" : r.user?.name || "User"}
                    </span>
                    {isStaff && !isMe && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">Admin</span>}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className={`text-sm px-3 py-2 rounded-lg ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="whitespace-pre-wrap">{r.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic text-center py-4">No replies yet.</p>
      )}

      {isLocked ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 py-3 rounded-md">
          <Lock className="h-4 w-4" />
          <span>This feedback is closed for new replies.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <Input 
            value={reply} 
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..." 
            disabled={replyMutation.isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={!reply.trim() || replyMutation.isPending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
