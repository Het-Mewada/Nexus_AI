import { motion } from "framer-motion";
import { useSmartSavingsAchievements } from "../api";
import { Lock, Award, Shield, Star, Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const IconMap: any = {
  star: Star,
  award: Award,
  shield: Shield,
  zap: Zap,
  brain: Brain
};

export function SmartSavingsAchievements() {
  const { data, isLoading } = useSmartSavingsAchievements();

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-card rounded-xl"></div>
      <div className="h-32 bg-card rounded-xl"></div>
    </div>;
  }

  if (!data) return null;

  const { unlocked, allBadges } = data;
  const unlockedCodes = new Set(unlocked.map((u: any) => u.code));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Your Badges of Honor</h2>
        <p className="text-muted-foreground text-sm mb-6">Earn achievements by making consistently smart financial decisions.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allBadges.map((badge: any, idx: number) => {
            const isUnlocked = unlockedCodes.has(badge.code);
            const Icon = IconMap[badge.icon] || Award;
            
            return (
              <motion.div
                key={badge.code}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "p-4 rounded-xl border flex flex-col items-center text-center transition-all duration-300",
                  isUnlocked 
                    ? "bg-card border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)] hover:scale-105 cursor-default" 
                    : "bg-background border-border opacity-60 grayscale"
                )}
              >
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-4 relative",
                  isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="w-8 h-8" />
                  {!isUnlocked && (
                    <div className="absolute -bottom-1 -right-1 bg-background p-1 rounded-full border border-border">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1">{badge.name}</h3>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
                {isUnlocked && (
                  <span className="mt-3 text-[10px] font-bold uppercase tracking-wider text-success">
                    Unlocked
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
