import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notificationApi } from "@/services/api";
import { formatDate } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const { data: notifResponse, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.list,
  });

  const notifications = notifResponse?.data?.notifications || [];
  
  const filteredNotifs = filter === "UNREAD" 
    ? notifications.filter(n => !n.isRead) 
    : notifications;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on your finances</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === "ALL" ? "default" : "outline"} 
            onClick={() => setFilter("ALL")}
            size="sm"
          >
            All
          </Button>
          <Button 
            variant={filter === "UNREAD" ? "default" : "outline"} 
            onClick={() => setFilter("UNREAD")}
            size="sm"
          >
            Unread
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || notifications.every(n => n.isRead)}
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Mark all read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Card key={i} className="animate-pulse h-20 bg-muted" />)}
        </div>
      ) : filteredNotifs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold">You're all caught up!</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              We'll notify you when you have upcoming bills, budget alerts, or new insights.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif, i) => (
            <motion.div 
              key={notif.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`hover:shadow-md transition-all ${!notif.isRead ? 'border-primary/30 bg-primary/5' : ''}`}>
                <CardContent className="p-4 flex gap-4 items-start">
                  <div className={`p-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-base font-semibold ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-sm mt-1 text-muted-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(notif.createdAt)}</p>
                  </div>

                  {!notif.isRead && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="shrink-0"
                      onClick={() => markReadMutation.mutate(notif.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Read
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
