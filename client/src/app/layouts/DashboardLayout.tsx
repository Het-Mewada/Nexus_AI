import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { systemApi, notificationApi } from "@/services/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Wallet, PieChart,
  Tag, Settings, User, LogOut, Search, Moon, Sun, Monitor,
  Menu, X, ChevronLeft, ChevronDown, ChevronRight, Target, Trophy, Calendar,
  Repeat, Briefcase, Shield, Calculator, Users, FolderClosed, Bell, Sparkles, PiggyBank, BrainCircuit, Contact, MessageSquare, ShieldAlert
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import { useMobile } from "@/hooks";

const navigationGroups = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, version: "v1" },
      { name: "Nexus Advisor", href: "/ai", icon: Search, version: "v1" },
      { name: "Nexus Agent", href: "/cfo", icon: BrainCircuit, version: "v1.1" },
      { name: "Analytics", href: "/analytics", icon: PieChart, version: "v1" },
      { name: "Notifications", href: "/notifications", icon: Bell, version: "v1" },
    ]
  },
  {
    label: "Finance",
    items: [
      { name: "Income", href: "/income", icon: TrendingUp, version: "v1" },
      { name: "Expenses", href: "/expenses", icon: TrendingDown, version: "v1" },
      { name: "Salary", href: "/salary", icon: Wallet, version: "v1" },
      { name: "Categories", href: "/categories", icon: Tag, version: "v1" },
    ]
  },
  {
    label: "Planning",
    items: [
      { name: "Budgets", href: "/budgets", icon: Target, version: "v1" },
      { name: "Smart Savings", href: "/smart-savings", icon: PiggyBank, version: "v1.1" },
      { name: "Calendar", href: "/calendar", icon: Calendar, version: "v1" },
      { name: "Goals", href: "/goals", icon: Trophy, version: "v1" },
      { name: "Nexus Coach", href: "/coach", icon: Sparkles, version: "v1.1" },
      { name: "Tax Planning", href: "/tax", icon: Calculator, version: "v1.1" },
    ]
  },
  {
    label: "Obligations",
    items: [
      { name: "Bills", href: "/bills", icon: Calendar, version: "v1" },
      { name: "Subscriptions", href: "/subscriptions", icon: Repeat, version: "v1" },
      { name: "Liabilities", href: "/liabilities", icon: Shield, version: "v1.1" },
    ]
  },
  {
    label: "Personal",
    items: [
      { name: "Portfolio", href: "/portfolio", icon: Briefcase, version: "v1.1" },
      { name: "Family", href: "/family", icon: Users, version: "v1" },
      { name: "Contacts", href: "/contacts", icon: Contact, version: "v1" },
      { name: "Documents", href: "/documents", icon: FolderClosed, version: "v1" },
    ]
  },
  {
    label: "Account",
    items: [
      { name: "Settings", href: "/settings", icon: Settings, version: "v1" },
      { name: "Feedback", href: "/feedback", icon: MessageSquare, version: "v1" },
    ]
  }
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const { data: featureData } = useQuery({
    queryKey: ["systemFeatures"],
    queryFn: systemApi.getFeatures,
    refetchInterval: 10000 // poll every 10s
  });

  const { data: notificationData } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.list,
    refetchInterval: 30000 // poll every 30s
  });

  const systemFeatures = featureData?.data?.features || {};
  const unreadCount = notificationData?.data?.unreadCount || 0;

  const adminGroup = user?.role === "ADMIN" ? [{
    label: "Admin Controls",
    items: [
      { name: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Feedbacks", href: "/admin/feedback", icon: MessageSquare },
      { name: "Feature Flags", href: "/admin/features", icon: Shield },
      { name: "Data Reset", href: "/admin/data-clear", icon: ShieldAlert },
    ]
  }] : [];


  // Filter navigationGroups based on systemFeatures (HIDDEN)
  const filteredNavGroups = navigationGroups
    .map(group => {
      const groupFeatureState = systemFeatures[group.label];
      // If the group is completely hidden, remove it
      if (groupFeatureState === "HIDDEN") return null;

      // Filter out items that are completely hidden
      const visibleItems = group.items.filter(item => {
        const itemFeatureState = systemFeatures[`${group.label}_${item.name}`];
        return itemFeatureState !== "HIDDEN";
      });

      if (visibleItems.length === 0) return null;
      return { ...group, items: visibleItems };
    })
    .filter(Boolean) as typeof navigationGroups;

  const navGroups = [...filteredNavGroups, ...adminGroup];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navGroups.forEach(g => {
      initialState[g.label] = true;
    });
    return initialState;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const ThemeIcon = themeIcon;
  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const currentItem = navGroups.flatMap((group) => group.items).find((item) => item.href === location.pathname);
  const currentGroup = navGroups.find((group) => group.items.some((item) => item.href === location.pathname));

  return (
    <div className="liquid-app flex h-screen overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(sidebarOpen || !isMobile) && (
          <motion.aside
            initial={isMobile ? { x: -280 } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -280 } : undefined}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "glass-sidebar flex flex-col border-r border-sidebar-border",
              isMobile ? "fixed inset-y-0 left-0 z-50 w-[248px] shadow-2xl" : "relative z-40",
              sidebarOpen ? "w-[248px]" : "w-[68px]"
            )}
          >
            {!isMobile && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={cn(
                  "absolute -right-4 top-4 z-50 h-8 w-8 rounded-full border shadow-md",
                  resolvedTheme === "light" ? "border-black bg-white text-black" : "border-sidebar-border bg-sidebar text-sidebar-foreground"
                )}
                style={resolvedTheme === "light" ? { color: "#000", borderColor: "#000", backgroundColor: "#fff" } : undefined}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
              </Button>
            )}

            {/* Logo */}
            <div className="flex h-[82px] items-center gap-3 border-b border-sidebar-border px-4 overflow-hidden">
              <img
                src="/nexus-favicon.svg"
                alt="Nexus AI"
                className="h-9 w-9 shrink-0 rounded-[10px]"
              />
              {sidebarOpen && (
                <div className="min-w-0">
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="block font-extrabold text-[17px] tracking-[-0.04em] text-sidebar-foreground whitespace-nowrap">Nexus AI</motion.span>
                  <span className="block mt-0.5 text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/40 whitespace-nowrap">Personal finance OS</span>
                </div>
              )}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="ml-auto h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-4 px-3 py-5 overflow-y-auto overflow-x-hidden scrollbar-none">
              {navGroups.map((group, groupIdx) => {
                const isGroupDisabled = systemFeatures[group.label] === "DISABLED";

                return (
                  <div key={group.label} className="space-y-1">
                    {sidebarOpen && (
                      <div
                        className={cn(
                          "px-3 flex items-center justify-between cursor-pointer group/header mb-2 mt-4 first:mt-0",
                          isGroupDisabled ? "opacity-50" : ""
                        )}
                        onClick={() => {
                          if (isGroupDisabled) {
                            toast.error(`The ${group.label} module is currently disabled by the admin.`);
                            return;
                          }
                          toggleGroup(group.label)
                        }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/38 group-hover/header:text-sidebar-foreground/70 transition-colors">
                          {group.label}
                        </span>
                        {expandedGroups[group.label] ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover/header:text-foreground transition-colors" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover/header:text-foreground transition-colors" />
                        )}
                      </div>
                    )}
                    {!sidebarOpen && groupIdx > 0 && (
                      <div className="h-px bg-sidebar-border/50 mx-4 my-2" />
                    )}
                    {(!sidebarOpen || expandedGroups[group.label]) && group.items.map((item) => {
                      const isActive = location.pathname === item.href;
                      const itemFeatureState = systemFeatures[`${group.label}_${item.name}`];
                      const isItemDisabled = isGroupDisabled || itemFeatureState === "DISABLED";

                      const className = cn(
                        "flex items-center gap-3 rounded-[10px] py-2.5 text-[13px] font-medium transition-all duration-200",
                        sidebarOpen ? "pl-5 pr-3 ml-2" : "px-3 justify-center",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_8px_20px_hsl(17_78%_52%/0.18)]"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-foreground/[0.08] hover:text-sidebar-foreground",
                        isItemDisabled && "opacity-50 grayscale hover:bg-transparent cursor-not-allowed text-sidebar-foreground/40 hover:text-sidebar-foreground/40"
                      );

                      if (isItemDisabled) {
                        return (
                          <div
                            key={item.name}
                            className={className}
                            title={!sidebarOpen ? item.name : undefined}
                            onClick={() => toast.error(`The ${item.name} feature is currently disabled by the admin.`)}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {sidebarOpen && <span className="whitespace-nowrap">{item.name}</span>}
                            <Shield className="h-3 w-3 ml-auto opacity-50" />
                          </div>
                        )
                      }

                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => isMobile && setSidebarOpen(false)}
                          className={className}
                          title={!sidebarOpen ? item.name : undefined}
                        >
                          <div className="relative">
                            <item.icon className={cn("h-[17px] w-[17px] shrink-0", isActive ? "text-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
                            {!sidebarOpen && item.name === "Notifications" && unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            )}
                          </div>
                          {sidebarOpen && (
                            <span className="whitespace-nowrap flex-1 flex items-center justify-between">
                              {item.name}
                              {item.name === "Notifications" && unreadCount > 0 && (
                                <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ml-2">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </span>
                          )}
                          {isActive && sidebarOpen && (
                            <motion.div
                              layoutId="sidebar-indicator"
                              className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )
              })}
            </nav>

            {/* User section */}
            {sidebarOpen && (
              <div className="border-t border-sidebar-border bg-sidebar/60 p-3">
                <div className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-sidebar-foreground/[0.06]">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user?.name || user?.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white dark:text-sidebar-foreground">{user?.name || "User"}</p>
                    <p className="truncate text-xs text-white/65 dark:text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="glass-topbar flex h-[82px] items-center gap-4 border-b px-4 md:px-8 sticky top-0 z-30">
          {isMobile && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex sm:hidden items-center gap-2">
                <img src="/nexus-favicon.svg" alt="Nexus AI" className="h-6 w-6 rounded-[6px]" />
                <span className="font-extrabold text-base tracking-tight text-foreground">Nexus AI</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 flex-1">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Workspace</span>
              <span className="text-border">/</span>
              <span className="font-semibold text-foreground">{currentItem?.name || "Overview"}</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={() => setTheme(nextTheme)} className="h-9 w-9 rounded-[9px]">
              <ThemeIcon className="h-4 w-4" />
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(user?.name || user?.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto" style={{ "--page-section": `"${currentGroup?.label || "Main"} /"` } as React.CSSProperties}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mx-auto w-full max-w-[1680px] p-5 md:p-8 lg:p-10"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
