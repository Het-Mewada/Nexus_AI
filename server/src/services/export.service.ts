import { prisma } from "../config/database";
import { toNumber, getMonthName } from "../utils/helpers";

function sanitizeCSVCell(value: string | null | undefined): string {
  if (!value) return '""';
  let str = value.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`; // Neutralizes formula execution
  }
  return `"${str}"`;
}

export class ExportService {
  async exportCSV(userId: string): Promise<string> {
    const [incomes, expenses, salaryRecords] = await Promise.all([
      prisma.income.findMany({
        where: { userId, deletedAt: null },
        orderBy: { date: "desc" },
      }),
      prisma.expense.findMany({
        where: { userId, deletedAt: null },
        include: { category: true },
        orderBy: { date: "desc" },
      }),
      prisma.salaryRecord.findMany({
        where: { userId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),
    ]);

    let csv = "Nexus AI — Financial Data Export\n";
    csv += `Generated: ${new Date().toISOString()}\n\n`;

    // Income section
    csv += "=== INCOME ===\n";
    csv += "Date,Source,Amount,Currency,Recurring,Notes\n";
    for (const income of incomes) {
      csv += `${income.date.toISOString().split("T")[0]},`;
      csv += `${sanitizeCSVCell(income.source)},`;
      csv += `${toNumber(income.amount)},`;
      csv += `${income.currency},`;
      csv += `${income.isRecurring ? "Yes" : "No"},`;
      csv += `${sanitizeCSVCell(income.notes)}\n`;
    }

    csv += "\n=== EXPENSES ===\n";
    csv += "Date,Merchant,Category,Amount,Payment Method,Tags,Notes\n";
    for (const expense of expenses) {
      csv += `${expense.date.toISOString().split("T")[0]},`;
      csv += `${sanitizeCSVCell(expense.merchant)},`;
      csv += `${sanitizeCSVCell(expense.category.name)},`;
      csv += `${toNumber(expense.amount)},`;
      csv += `${expense.paymentMethod},`;
      csv += `${sanitizeCSVCell(expense.tags.join("; "))},`;
      csv += `${sanitizeCSVCell(expense.notes)}\n`;
    }

    csv += "\n=== SALARY RECORDS ===\n";
    csv += "Month,Year,Base Salary,Leaves,Half Days,Bonus,Deductions,Expected Salary\n";
    for (const salary of salaryRecords) {
      csv += `${getMonthName(salary.month)},`;
      csv += `${salary.year},`;
      csv += `${toNumber(salary.baseSalary)},`;
      csv += `${salary.leaves},`;
      csv += `${salary.halfDays},`;
      csv += `${toNumber(salary.bonus)},`;
      csv += `${toNumber(salary.otherDeductions)},`;
      csv += `${toNumber(salary.expectedSalary)}\n`;
    }

    return csv;
  }
}

export const exportService = new ExportService();
