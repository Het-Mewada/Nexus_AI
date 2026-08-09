import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Lightbulb, MessageSquare, Wrench } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GlobalFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "feedbacks", statusFilter],
    queryFn: () => adminApi.listFeedbacks(statusFilter !== "ALL" ? { status: statusFilter } : undefined),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.updateFeedbackStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feedbacks"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Feedback status updated");
    },
    onError: () => toast.error("Failed to update status")
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BUG": return <Bug className="h-4 w-4 text-red-500" />;
      case "FEATURE_REQUEST": return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case "IMPROVEMENT": return <Wrench className="h-4 w-4 text-emerald-500" />;
      default: return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN": return <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/10">Open</Badge>;
      case "IN_PROGRESS": return <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/10">In Progress</Badge>;
      case "RESOLVED": return <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Resolved</Badge>;
      case "REJECTED": return <Badge variant="outline" className="text-red-500 border-red-500/20 bg-red-500/10">Rejected</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const feedbacks = data?.data?.feedbacks || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Feedback</h1>
          <p className="text-muted-foreground">Manage user reports and feature requests.</p>
        </div>
        
        <div className="w-full md:w-64">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/50 rounded-t-xl border-b border-border" />
                <CardContent className="h-16 bg-muted/30" />
              </Card>
            ))}
          </div>
        ) : feedbacks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">No feedback found</h3>
              <p className="text-muted-foreground text-sm mt-1">There are no feedback entries matching this filter.</p>
            </CardContent>
          </Card>
        ) : (
          feedbacks.map((feedback: any) => (
            <Card key={feedback.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(feedback.type)}
                      <CardTitle className="text-base">{feedback.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>By: {feedback.user?.name || feedback.user?.email || "Unknown"}</span>
                      <span>•</span>
                      <span>{format(new Date(feedback.createdAt), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(feedback.status)}
                    <Select 
                      value={feedback.status} 
                      onValueChange={(val) => statusMutation.mutate({ id: feedback.id, status: val })}
                      disabled={statusMutation.isPending}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{feedback.description}</p>
                
                {feedback.attachments && feedback.attachments.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                    {feedback.attachments.map((url: string, index: number) => (
                      <a key={index} href={url} target="_blank" rel="noreferrer" className="block relative group shrink-0">
                        <img src={url} alt="Attachment" className="h-20 w-20 object-cover rounded-md border border-border" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
