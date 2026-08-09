import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { systemApi } from "@/services/api";
import { Loader2 } from "lucide-react";
import FeatureDisabledPage from "@/features/error/FeatureDisabledPage";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }
  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}


const ROUTE_FEATURE_MAP: Record<string, string> = {
  "/income": "Finance_Income",
  "/expenses": "Finance_Expenses",
  "/salary": "Finance_Salary",
  "/categories": "Finance_Categories",
  "/budgets": "Planning_Budgets",
  "/smart-savings": "Planning_Smart Savings",
  "/calendar": "Planning_Calendar",
  "/events": "Planning_Calendar",
  "/goals": "Planning_Goals",
  "/coach": "Planning_Nexus Coach",
  "/tax": "Planning_Tax Planning",
  "/bills": "Obligations_Bills",
  "/subscriptions": "Obligations_Subscriptions",
  "/liabilities": "Obligations_Liabilities",
  "/portfolio": "Personal_Portfolio",
  "/investments": "Personal_Portfolio",
  "/market": "Personal_Portfolio",
  "/family": "Personal_Family",
  "/contacts": "Personal_Address Book",
  "/addresses": "Personal_Address Book",
  "/documents": "Personal_Documents",
  "/ai": "Main_Nexus Advisor",
  "/conversations": "Main_Nexus Advisor",
  "/cfo": "Main_Nexus Agent",
  "/agent": "Main_Nexus Agent",
  "/analytics": "Main_Analytics",
};

export function FeatureGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;

  let featureKey: string | undefined = undefined;
  for (const route of Object.keys(ROUTE_FEATURE_MAP)) {
    if (pathname.startsWith(route)) {
      featureKey = ROUTE_FEATURE_MAP[route];
      break;
    }
  }

  const { data: featureData, isLoading } = useQuery({
    queryKey: ["systemFeatures"],
    queryFn: systemApi.getFeatures,
    refetchInterval: 10000,
    enabled: !!featureKey,
  });

  if (!featureKey) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  const systemFeatures = featureData?.data?.features || {};
  const groupKey = featureKey.split("_")[0] as string;

  if (systemFeatures[groupKey] === "HIDDEN" || systemFeatures[groupKey] === "DISABLED" ||
    systemFeatures[featureKey] === "HIDDEN" || systemFeatures[featureKey] === "DISABLED") {
    const featureName = featureKey.split("_")[1] || groupKey;
    return <FeatureDisabledPage featureName={featureName} />;
  }

  return <>{children}</>;
}
