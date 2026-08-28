import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  const { pathname } = useLocation();
  const section = eyebrow || getPageSection(pathname);

  return (
    <header className={cn("flex flex-col gap-5 border-b border-border/80 pb-7 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <p className="shrink-0 text-[12px] font-bold uppercase tracking-[0.18em] text-primary">{section} /</p>
          <h1 className="page-title text-[clamp(2rem,3vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.06em]">{title}</h1>
        </div>
        {description && <p className="mt-3 max-w-2xl text-[15px] leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

function getPageSection(pathname: string) {
  if (["/income", "/expenses", "/salary", "/categories"].includes(pathname)) return "Finance";
  if (["/budgets", "/smart-savings", "/calendar", "/goals", "/coach", "/tax"].includes(pathname)) return "Planning";
  if (["/bills", "/subscriptions", "/liabilities"].includes(pathname)) return "Obligations";
  if (["/portfolio", "/family", "/contacts", "/documents"].includes(pathname)) return "Personal";
  if (["/settings", "/feedback"].includes(pathname)) return "Account";
  if (pathname.startsWith("/admin")) return "Admin Controls";
  return "Main";
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-base font-bold tracking-[-0.03em]">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
