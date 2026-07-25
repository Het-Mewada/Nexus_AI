import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiCfoApi, spendingBehaviorApi } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, DollarSign, BrainCircuit, Check, X, Clock, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import NegotiationAssistant from "./NegotiationAssistant";

export default function AiCfoPage() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingBehavior, setIsAnalyzingBehavior] = useState(false);

  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ["ai-cfo-recommendations"],
    queryFn: aiCfoApi.getRecommendations,
  });

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ["spending-behavior-insights"],
    queryFn: spendingBehaviorApi.getInsights,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: "ACCEPTED" | "DISMISSED" | "POSTPONED" }) => 
      aiCfoApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-cfo-recommendations"] });
      toast.success("Recommendation updated");
    }
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await aiCfoApi.generateManual();
      queryClient.invalidateQueries({ queryKey: ["ai-cfo-recommendations"] });
      toast.success("New recommendations generated!");
    } catch (error) {
      toast.error("Failed to generate");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeBehavior = async () => {
    try {
      setIsAnalyzingBehavior(true);
      const res = await spendingBehaviorApi.analyze();
      queryClient.invalidateQueries({ queryKey: ["spending-behavior-insights"] });
      toast.success(`Found ${res.newInsightsCount} new insights!`);
    } catch (error) {
      toast.error("Failed to analyze behavior");
    } finally {
      setIsAnalyzingBehavior(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'SPENDING': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'INVESTMENT': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'DEBT': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'TAX': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'SAVINGS': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'WARNING': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (loadingRecs || loadingInsights) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Chief Financial Officer</h1>
        <p className="text-muted-foreground mt-2">Strategic, long-term financial guidance and behavior analysis powered by AI.</p>
      </div>

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="recommendations">Strategic Recommendations</TabsTrigger>
          <TabsTrigger value="behavior">Spending Behavior</TabsTrigger>
          <TabsTrigger value="negotiation">Negotiation Assistant</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recommendations" className="space-y-6 mt-6">
          <div className="flex justify-between items-center bg-card p-6 rounded-xl border shadow-sm">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BrainCircuit className="text-primary w-6 h-6" /> 
                Proactive Financial Monitoring
              </h2>
              <p className="text-muted-foreground mt-1">Your AI CFO continuously analyzes your profile to find opportunities.</p>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
              Run Deep Analysis
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations?.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Your finances are optimized!</h3>
                <p className="text-muted-foreground">No pending strategic recommendations at this time.</p>
              </div>
            ) : (
              recommendations?.map((rec: any) => (
                <Card key={rec.id} className="flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <Badge className={getCategoryColor(rec.category)} variant="secondary">
                      {rec.category}
                    </Badge>
                  </div>
                  <CardHeader className="pt-8">
                    <CardTitle className="text-xl leading-tight">{rec.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rec.description}
                    </p>
                    {rec.impactAmount && Number(rec.impactAmount) > 0 && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 p-2 rounded-md w-fit">
                        <TrendingUp className="w-4 h-4" />
                        Estimated Impact: +{Number(rec.impactAmount).toLocaleString()}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md italic border">
                      <span className="font-semibold block mb-1">AI Reasoning:</span>
                      {rec.reasoning}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2 justify-end border-t pt-4 bg-muted/10">
                    <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate({ id: rec.id, status: "DISMISSED" })}>
                      <X className="w-4 h-4 mr-1" /> Dismiss
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate({ id: rec.id, status: "POSTPONED" })}>
                      <Clock className="w-4 h-4 mr-1" /> Later
                    </Button>
                    <Button size="sm" onClick={() => updateStatusMutation.mutate({ id: rec.id, status: "ACCEPTED" })}>
                      <Check className="w-4 h-4 mr-1" /> Implement
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6 mt-6">
          <div className="flex justify-between items-center bg-card p-6 rounded-xl border shadow-sm">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BrainCircuit className="text-primary w-6 h-6" /> 
                Behavioral Analysis
              </h2>
              <p className="text-muted-foreground mt-1">AI analyzes your last 90 days of transactions for hidden patterns.</p>
            </div>
            <Button onClick={handleAnalyzeBehavior} disabled={isAnalyzingBehavior}>
              {isAnalyzingBehavior ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
              Analyze Patterns
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights?.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <BrainCircuit className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No behavioral patterns detected</h3>
                <p className="text-muted-foreground">Run an analysis to discover insights about your spending habits.</p>
              </div>
            ) : (
              insights?.map((insight: any) => (
                <Card key={insight.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(insight.severity)}
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                      </div>
                      <Badge variant="outline">{insight.type.replace(/_/g, ' ')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mt-2">{insight.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="negotiation" className="space-y-6 mt-6">
          <div className="flex justify-between items-center bg-card p-6 rounded-xl border shadow-sm">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BrainCircuit className="text-primary w-6 h-6" /> 
                Negotiation Assistant
              </h2>
              <p className="text-muted-foreground mt-1">Get AI-powered scripts and strategies to lower your bills or negotiate your salary.</p>
            </div>
          </div>
          <NegotiationAssistant />
        </TabsContent>
      </Tabs>
    </div>
  );
}
