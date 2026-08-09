import { FileQuestion, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500 bg-background text-foreground">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary mb-8"
      >
        <FileQuestion className="h-12 w-12" />
      </motion.div>
      <h1 className="text-4xl font-bold tracking-tight mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
        Oops! The page you are looking for doesn't exist or has been moved.
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
