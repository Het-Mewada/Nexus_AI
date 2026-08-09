import { Request, Response, NextFunction } from "express";
import { systemService } from "../services/system.service";

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
  "/agent": "Main_Nexus Agent",
  "/analytics/dashboard": "IGNORE",
  "/analytics/charts": "IGNORE",
  "/analytics": "Main_Analytics",
};

export const featureMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Identify base route - sort by length descending to match most specific route first
  let featureKey: string | null = null;
  const routes = Object.keys(ROUTE_FEATURE_MAP).sort((a, b) => b.length - a.length);
  
  for (const route of routes) {
    if (req.path.startsWith(route)) {
      featureKey = ROUTE_FEATURE_MAP[route];
      break;
    }
  }

  if (featureKey && featureKey !== "IGNORE") {
    const settings = await systemService.getSettings();
    const groupKey = featureKey.split("_")[0];
    
    // Check if the whole group is completely disabled
    if (settings[groupKey] === "HIDDEN" || settings[groupKey] === "DISABLED") {
      res.status(403).json({ success: false, error: `The ${groupKey} feature is currently disabled by the administrator.` });
      return;
    }

    // Check if the specific item is completely disabled
    if (settings[featureKey] === "HIDDEN" || settings[featureKey] === "DISABLED") {
      res.status(403).json({ success: false, error: `This feature is currently disabled by the administrator.` });
      return;
    }
  }

  next();
};
