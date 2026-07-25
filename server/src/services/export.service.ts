import { prisma } from "../config/database";
import { toNumber, getMonthName } from "../utils/helpers";

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

    let csv = "MoneyOS AI — Financial Data Export\n";
    csv += `Generated: ${new Date().toISOString()}\n\n`;

    // Income section
    csv += "=== INCOME ===\n";
    csv += "Date,Source,Amount,Currency,Recurring,Notes\n";
    for (const income of incomes) {
      csv += `${income.date.toISOString().split("T")[0]},`;
      csv += `"${income.source}",`;
      csv += `${toNumber(income.amount)},`;
      csv += `${income.currency},`;
      csv += `${income.isRecurring ? "Yes" : "No"},`;
      csv += `"${(income.notes || "").replace(/"/g, '""')}"\n`;
    }

    csv += "\n=== EXPENSES ===\n";
    csv += "Date,Merchant,Category,Amount,Payment Method,Tags,Notes\n";
    for (const expense of expenses) {
      csv += `${expense.date.toISOString().split("T")[0]},`;
      csv += `"${expense.merchant}",`;
      csv += `"${expense.category.name}",`;
      csv += `${toNumber(expense.amount)},`;
      csv += `${expense.paymentMethod},`;
      csv += `"${expense.tags.join("; ")}",`;
      csv += `"${(expense.notes || "").replace(/"/g, '""')}"\n`;
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
