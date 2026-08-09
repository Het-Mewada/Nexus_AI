import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { MessageSquare, Bug, Lightbulb, CheckCircle2, Upload, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { feedbackApi } from "@/services/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { Feedback } from "@/types";

const feedbackSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Please provide more details (min 10 characters)"),
  type: z.enum(["BUG", "FEATURE_REQUEST", "GENERAL", "IMPROVEMENT"]),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("submit");
  const [files, setFiles] = useState<File[]>([]);

  const { data: feedbacksResponse, isLoading } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: () => feedbackApi.list(),
  });

  const feedbacks = feedbacksResponse?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: "GENERAL",
    },
  });

  const submitMutation = useMutation({
    mutationFn: (formData: FormData) => feedbackApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast.success("Feedback submitted successfully!");
      reset();
      setFiles([]);
      setActiveTab("my-feedbacks");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feedbackApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast.success("Feedback deleted");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (files.length + selectedFiles.length > 3) {
        toast.error("You can only upload up to 3 screenshots");
        return;
      }
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: FeedbackFormValues) => {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("type", data.type);
    
    files.forEach((file) => {
      formData.append("attachments", file);
    });

    submitMutation.mutate(formData);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BUG": return <Bug className="h-4 w-4" />;
      case "FEATURE_REQUEST": return <Lightbulb className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN": return <Badge variant="secondary">Open</Badge>;
      case "IN_PROGRESS": return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case "RESOLVED": return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle2 className="h-3 w-3 mr-1"/> Resolved</Badge>;
      case "REJECTED": return <Badge variant="destructive">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback & Support</h1>
        <p className="text-muted-foreground mt-2">
          Help us improve! Report bugs, request features, or share your thoughts.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="submit">Submit Feedback</TabsTrigger>
          <TabsTrigger value="my-feedbacks">My Feedbacks</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send your thoughts</CardTitle>
              <CardDescription>Include screenshots for bug reports to help us resolve them faster.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Feedback Type</Label>
                  <Select value={watch("type")} onValueChange={(val: any) => setValue("type", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUG">Bug Report</SelectItem>
                      <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                      <SelectItem value="IMPROVEMENT">Improvement</SelectItem>
                      <SelectItem value="GENERAL">General Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="Brief summary" {...register("title")} />
                  {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Provide detailed information..." 
                    className="min-h-[120px]"
                    {...register("description")} 
                  />
                  {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Attachments (Screenshots - Max 3)</Label>
                  
                  {files.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 border rounded bg-muted/50 text-sm max-w-[200px]">
                          <span className="truncate flex-1">{file.name}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeFile(i)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {files.length < 3 && (
                    <div 
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload screenshots</p>
                      <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, max 5MB</p>
                    </div>
                  )}
                  <input 
                    id="file-upload" 
                    type="file" 
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <Button type="submit" variant="gradient" className="w-full" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-feedbacks" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-20 bg-muted rounded" /></CardContent></Card>
              ))}
            </div>
          ) : feedbacks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold">No feedback submitted</h3>
                <p className="text-muted-foreground text-sm mt-1">You haven't submitted any feedback yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("submit")}>
                  Submit Feedback
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback: Feedback, i: number) => (
                <motion.div key={feedback.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(feedback.type)}
                          <CardTitle className="text-base">{feedback.title}</CardTitle>
                        </div>
                        <CardDescription>{formatDate(feedback.createdAt)}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(feedback.status)}
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(feedback.id)} title="Delete feedback">
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{feedback.description}</p>
                      
                      {feedback.attachments && feedback.attachments.length > 0 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                          {feedback.attachments.map((url, index) => (
                            <a key={index} href={url} target="_blank" rel="noreferrer" className="block relative group shrink-0">
                              <img src={url} alt="Attachment" className="h-20 w-20 object-cover rounded-md border" />
                            </a>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
