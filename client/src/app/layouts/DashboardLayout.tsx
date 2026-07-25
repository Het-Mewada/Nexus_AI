import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Wallet, PieChart,
  Tag, Settings, User, LogOut, Search, Moon, Sun, Monitor,
  Menu, X, ChevronLeft, ChevronDown, ChevronRight, Target, Trophy, Calendar,
  Repeat, Briefcase, Shield, Calculator, Users, FolderClosed, Bell, Sparkles, PiggyBank, BrainCircuit, Contact
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Nexus Advisor", href: "/ai", icon: Search },
      { name: "Nexus Agent", href: "/cfo", icon: BrainCircuit },
      { name: "Analytics", href: "/analytics", icon: PieChart },
      { name: "Notifications", href: "/notifications", icon: Bell },
    ]
  },
  {
    label: "Finance",
    items: [
      { name: "Income", href: "/income", icon: TrendingUp },
      { name: "Expenses", href: "/expenses", icon: TrendingDown },
      { name: "Salary", href: "/salary", icon: Wallet },
      { name: "Categories", href: "/categories", icon: Tag },
    ]
  },
  {
    label: "Planning",
    items: [
      { name: "Budgets", href: "/budgets", icon: Target },
      { name: "Smart Savings", href: "/smart-savings", icon: PiggyBank },
      { name: "Calendar", href: "/calendar", icon: Calendar },
      { name: "Goals", href: "/goals", icon: Trophy },
      { name: "Nexus Coach", href: "/coach", icon: Sparkles },
      { name: "Tax Planning", href: "/tax", icon: Calculator },
    ]
  },
  {
    label: "Obligations",
    items: [
      { name: "Bills", href: "/bills", icon: Calendar },
      { name: "Subscriptions", href: "/subscriptions", icon: Repeat },
      { name: "Liabilities", href: "/liabilities", icon: Shield },
    ]
  },
  {
    label: "Personal",
    items: [
      { name: "Portfolio", href: "/portfolio", icon: Briefcase },
      { name: "Family", href: "/family", icon: Users },
      { name: "Address Book", href: "/contacts", icon: Contact },
      { name: "Documents", href: "/documents", icon: FolderClosed },
    ]
  },
  {
    label: "Account",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navigationGroups.forEach(g => {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const ThemeIcon = themeIcon;
  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(sidebarOpen || !isMobile) && (
          <motion.aside
            initial={isMobile ? { x: -280 } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -280 } : undefined}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "flex flex-col border-r border-sidebar-border bg-sidebar",
              isMobile ? "fixed inset-y-0 left-0 z-50 w-[280px] shadow-2xl" : "relative",
              sidebarOpen ? "w-[280px]" : "w-[72px]"
            )}
          >
            {!isMobile && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute -right-3 top-5 z-50 h-6 w-6 rounded-full border-sidebar-border shadow-sm bg-background"
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
              </Button>
            )}

            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4 overflow-hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shrink-0">
                N
              </div>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold text-lg gradient-text whitespace-nowrap"
                >
                  Nexus AI
                </motion.span>
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
            <nav className="flex-1 space-y-6 px-3 py-4 overflow-y-auto overflow-x-hidden scrollbar-none">
              {navigationGroups.map((group, groupIdx) => (
                <div key={group.label} className="space-y-1">
                  {sidebarOpen && (
                    <div 
                      className="px-3 flex items-center justify-between cursor-pointer group/header mb-2 mt-4 first:mt-0"
                      onClick={() => toggleGroup(group.label)}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 group-hover/header:text-foreground transition-colors">
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
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                          sidebarOpen ? "pl-5 pr-3 ml-2" : "px-3 justify-center",
                          isActive
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-border/50 hover:text-sidebar-foreground",
                        )}
                        title={!sidebarOpen ? item.name : undefined}
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                        {sidebarOpen && <span className="whitespace-nowrap">{item.name}</span>}
                        {isActive && sidebarOpen && (
                          <motion.div
                            layoutId="sidebar-indicator"
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* User section */}
            {sidebarOpen && (
              <div className="border-t border-sidebar-border p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(user?.name || user?.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
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
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6 sticky top-0 z-30">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-none"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={() => setTheme(nextTheme)} className="h-9 w-9">
              <ThemeIcon className="h-4 w-4" />
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
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
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-4 md:p-6 lg:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
