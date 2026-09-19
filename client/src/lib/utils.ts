import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency?: string): string {
  const currentCurrency = currency || (typeof window !== 'undefined' ? localStorage.getItem("user_currency") : null) || "INR";
  
  let locale = "en-IN";
  if (currentCurrency === "USD") locale = "en-US";
  else if (currentCurrency === "EUR") locale = "de-DE";
  else if (currentCurrency === "GBP") locale = "en-GB";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currentCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency?: string): string {
  if (amount === 0) {
    const symbol = currencies.find((c) => c.value === (currency || "INR"))?.symbol || "₹";
    return `${symbol}0`;
  }

  const currentCurrency =
    currency || (typeof window !== "undefined" ? localStorage.getItem("user_currency") : null) || "INR";

  let locale = "en-IN";
  if (currentCurrency === "USD") locale = "en-US";
  else if (currentCurrency === "EUR") locale = "de-DE";
  else if (currentCurrency === "GBP") locale = "en-GB";

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currentCurrency,
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(amount);

    return formatted.replace(/\.0(?=[KkLMmBbCr]|$)/, "");
  } catch {
    const symbol = currencies.find((c) => c.value === currentCurrency)?.symbol || "₹";
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";

    if (abs >= 10_000_000) return `${sign}${symbol}${(abs / 10_000_000).toFixed(1).replace(/\.0$/, "")}Cr`;
    if (abs >= 100_000) return `${sign}${symbol}${(abs / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
    if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    return `${sign}${symbol}${abs}`;
  }
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1] || "Unknown";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "debit_card", label: "Debit Card" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" },
] as const;

export const currencies = [
  { value: "INR", label: "₹ INR", symbol: "₹" },
  { value: "USD", label: "$ USD", symbol: "$" },
  { value: "EUR", label: "€ EUR", symbol: "€" },
  { value: "GBP", label: "£ GBP", symbol: "£" },
] as const;
