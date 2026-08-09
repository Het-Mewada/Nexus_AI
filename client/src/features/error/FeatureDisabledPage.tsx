import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface FeatureDisabledPageProps {
  featureName?: string;
}

export default function FeatureDisabledPage({ featureName = "This feature" }: FeatureDisabledPageProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-8"
      >
        <ShieldAlert className="h-12 w-12" />
      </motion.div>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Access Restricted</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
        {featureName} is currently disabled by the system administrator. 
        Please contact support if you believe this is an error.
      </p>
      <Button asChild size="lg" className="gap-2">
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Return to Dashboard
        </Link>
      </Button>
    </div>
  );
}
