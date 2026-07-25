import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { negotiationApi } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Handshake, Briefcase, FileText, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function NegotiationAssistant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isStarting, setIsStarting] = useState(false);

  const startNegotiationMutation = useMutation({
    mutationFn: (topic: string) => negotiationApi.startNegotiation(topic),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Negotiation session started");
      navigate(`/ai?conversationId=${data.id}`);
    },
    onError: () => {
      toast.error("Failed to start negotiation");
    },
    onSettled: () => setIsStarting(false)
  });

  const handleStart = (topic: string) => {
    setIsStarting(true);
    startNegotiationMutation.mutate(topic);
  };

  const templates = [
    {
      id: "RENT",
      title: "Rent Negotiation",
      description: "Get help drafting a script or email to lower your rent or prevent an increase.",
      icon: <FileText className="w-8 h-8 text-blue-500 mb-4" />,
      color: "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"
    },
    {
      id: "SALARY",
      title: "Salary Negotiation",
      description: "Prepare for a performance review or job offer with market data and strategy.",
      icon: <Briefcase className="w-8 h-8 text-green-500 mb-4" />,
      color: "border-green-200 bg-green-50/50 dark:bg-green-950/20"
    },
    {
      id: "BILLS",
      title: "Bill Reduction",
      description: "Scripts to call providers (internet, medical, phone) and negotiate better rates.",
      icon: <MessageSquare className="w-8 h-8 text-orange-500 mb-4" />,
      color: "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20"
    },
    {
      id: "CUSTOM",
      title: "Custom Negotiation",
      description: "Buying a car? Need to return something past the window? Ask for custom advice.",
      icon: <Handshake className="w-8 h-8 text-purple-500 mb-4" />,
      color: "border-purple-200 bg-purple-50/50 dark:bg-purple-950/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {templates.map((tpl) => (
        <Card key={tpl.id} className={`flex flex-col border transition-all hover:shadow-md ${tpl.color}`}>
          <CardHeader>
            {tpl.icon}
            <CardTitle className="text-xl">{tpl.title}</CardTitle>
            <CardDescription className="text-sm mt-2">{tpl.description}</CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto pt-4">
            <Button 
              className="w-full justify-between" 
              onClick={() => handleStart(tpl.id)}
              disabled={isStarting}
            >
              Start Session <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
