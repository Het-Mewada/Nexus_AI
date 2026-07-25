import * as Lucide from "lucide-react";

export function CategoryIcon({ name, ...props }: { name: string; className?: string; style?: React.CSSProperties }) {
  const iconMap: Record<string, React.ComponentType<any>> = {
    "utensils": Lucide.Utensils,
    "shopping-bag": Lucide.ShoppingBag,
    "fuel": Lucide.Fuel,
    "plane": Lucide.Plane,
    "home": Lucide.Home,
    "zap": Lucide.Zap,
    "wifi": Lucide.Wifi,
    "heart-pulse": Lucide.HeartPulse,
    "gamepad-2": Lucide.Gamepad2,
    "trending-up": Lucide.TrendingUp,
    "graduation-cap": Lucide.GraduationCap,
    "users": Lucide.Users,
    "tag": Lucide.Tag
  };

  const IconComponent = iconMap[name] || Lucide.Tag;
  return <IconComponent {...props} />;
}
