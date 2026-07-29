import { Decimal } from "@prisma/client/runtime/library";

export function toNumber(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return value.toNumber();
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getMonthDateRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return getMonthDateRange(now.getFullYear(), now.getMonth() + 1);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function calculateExpectedSalary(
  baseSalary: number,
  leaves: number,
  halfDays: number,
  bonus: number,
  otherDeductions: number,
  year: number,
  month: number
): number {
  const workingDays = getDaysInMonth(year, month);
  const perDayRate = baseSalary / workingDays;
  const leaveDeduction = leaves * perDayRate;
  const halfDayDeduction = halfDays * (perDayRate / 2);
  const totalDeductions = leaveDeduction + halfDayDeduction + otherDeductions;
  const expected = baseSalary - totalDeductions + bonus;
  return Math.max(0, Math.round(expected * 100) / 100);
}

export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1] || "Unknown";
}
