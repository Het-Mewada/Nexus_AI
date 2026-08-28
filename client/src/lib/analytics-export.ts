import type { CashFlowData, CategoryBreakdownItem, ChartData } from "@/types";

export type AnalyticsExportFormat = "xlsx" | "pdf" | "pptx" | "json";

type AnalyticsExportPayload = {
  year: number;
  currencyCode?: string;
  charts?: ChartData;
  cashFlow?: CashFlowData;
  categories?: CategoryBreakdownItem[];
};

function formatMoney(value: number, currencyCode = "INR", pdfSafe = false) {
  if (pdfSafe && currencyCode === "INR") {
    return `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(value);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

function totals({ charts, categories }: AnalyticsExportPayload) {
  const rows = charts?.monthlyComparison || [];
  return {
    income: rows.reduce((sum, row) => sum + Number(row.income || 0), 0),
    expenses: rows.reduce((sum, row) => sum + Number(row.expense || 0), 0),
    savings: rows.reduce((sum, row) => sum + Number(row.cashFlow || 0), 0),
    categories: categories?.length || 0,
  };
}

async function exportXlsx(payload: AnalyticsExportPayload) {
  const XLSX = await import("xlsx");
  const comparison = payload.charts?.monthlyComparison || [];
  const cashFlow = payload.cashFlow?.cashFlow || [];
  const categories = payload.categories || [];
  const summary = totals(payload);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Metric: "Report year", Value: payload.year },
    { Metric: "Total income", Value: summary.income },
    { Metric: "Total expenses", Value: summary.expenses },
    { Metric: "Net cash flow", Value: summary.savings },
  ]), "Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(comparison.map((row) => ({
    Month: row.month, Income: row.income, Expenses: row.expense, "Net cash flow": row.cashFlow,
  }))), "Monthly Trends");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cashFlow.map((row) => ({
    Month: row.month, Income: row.income, Expenses: row.expense, Net: row.net, "Running balance": row.runningBalance,
  }))), "Cash Flow");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categories.map((row) => ({
    Category: row.name, Amount: row.total, Transactions: row.count,
  }))), "Categories");

  XLSX.writeFile(workbook, `nexus-analytics-${payload.year}-${fileDate()}.xlsx`);
}

async function exportPdf(payload: AnalyticsExportPayload) {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const summary = totals(payload);
  const rows = payload.charts?.monthlyComparison || [];
  const categories = payload.categories || [];
  const orange = [239, 91, 37] as [number, number, number];
  const ink = [18, 39, 31] as [number, number, number];

  doc.setFillColor(...ink);
  doc.rect(0, 0, pageWidth, 112, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Nexus AI", 42, 46);
  doc.setFontSize(18);
  doc.text("Analytics Report", 42, 78);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Financial overview · ${payload.year} · Generated ${fileDate()}`, pageWidth - 42, 62, { align: "right" });

  const cards = [["Total income", summary.income], ["Total expenses", summary.expenses], ["Net cash flow", summary.savings]];
  cards.forEach(([label, value], index) => {
    const x = 42 + index * 176;
    doc.setFillColor(247, 244, 238);
    doc.roundedRect(x, 138, 158, 68, 10, 10, "F");
    doc.setTextColor(105, 119, 112);
    doc.setFontSize(10);
    doc.text(String(label), x + 14, 160);
    doc.setTextColor(...ink);
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.text(formatMoney(Number(value), payload.currencyCode, true), x + 14, 187);
    doc.setFont("helvetica", "normal");
  });

  doc.setTextColor(...ink);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Monthly performance", 42, 246);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const tableY = 268;
  doc.setFillColor(...orange);
  doc.rect(42, tableY - 15, pageWidth - 84, 24, "F");
  doc.setTextColor(255, 255, 255);
  ["Month", "Income", "Expenses", "Net cash flow"].forEach((header, index) => doc.text(header, [52, 250, 365, 480][index] ?? 52, tableY));
  rows.slice(0, 12).forEach((row, index) => {
    const y = tableY + 27 + index * 22;
    if (index % 2 === 0) { doc.setFillColor(250, 249, 246); doc.rect(42, y - 14, pageWidth - 84, 22, "F"); }
    doc.setTextColor(...ink);
    doc.text(row.month, 52, y);
    doc.text(formatMoney(row.income, payload.currencyCode, true), 250, y);
    doc.text(formatMoney(row.expense, payload.currencyCode, true), 365, y);
    doc.text(formatMoney(row.cashFlow, payload.currencyCode, true), 480, y);
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Top categories", 42, 54);
  doc.setFont("helvetica", "normal");
  categories.slice(0, 6).forEach((category, index) => {
    const y = 88 + index * 30;
    doc.setFillColor(244, 239, 232);
    doc.roundedRect(42, y - 16, pageWidth - 84, 22, 5, 5, "F");
    doc.setTextColor(...ink);
    doc.text(category.name, 56, y);
    doc.text(formatMoney(category.total, payload.currencyCode, true), pageWidth - 56, y, { align: "right" });
  });
  doc.save(`nexus-analytics-${payload.year}-${fileDate()}.pdf`);
}

async function exportPptx(payload: AnalyticsExportPayload) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Nexus AI";
  pptx.subject = `Analytics report ${payload.year}`;
  const summary = totals(payload);
  const categories = payload.categories || [];
  const slide = pptx.addSlide();
  slide.background = { color: "12271F" };
  slide.addText("Nexus AI", { x: 0.7, y: 0.7, w: 5, h: 0.45, fontFace: "Aptos Display", fontSize: 28, bold: true, color: "FFFFFF" });
  slide.addText(`Analytics Report · ${payload.year}`, { x: 0.7, y: 1.25, w: 8, h: 0.35, fontSize: 16, color: "F2A07B" });
  [["Total income", summary.income], ["Total expenses", summary.expenses], ["Net cash flow", summary.savings]].forEach(([label, value], index) => {
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.7 + index * 3.8, y: 2.2, w: 3.35, h: 1.25, rectRadius: 0.08, fill: { color: "1F3B30" }, line: { color: "385A4B" } });
    slide.addText(String(label), { x: 0.95 + index * 3.8, y: 2.48, w: 2.8, h: 0.2, fontSize: 12, color: "A9BEB4" });
    slide.addText(formatMoney(Number(value), payload.currencyCode), { x: 0.95 + index * 3.8, y: 2.8, w: 2.8, h: 0.35, fontSize: 22, bold: true, color: "FFFFFF" });
  });
  const rows = payload.charts?.monthlyComparison || [];
  slide.addText("Monthly performance", { x: 0.7, y: 4.15, w: 4, h: 0.3, fontSize: 18, bold: true, color: "12271F" });
  slide.addTable([
    ["Month", "Income", "Expenses", "Net cash flow"].map((text) => ({ text })),
    ...rows.slice(0, 8).map((row) => [row.month, formatMoney(row.income, payload.currencyCode), formatMoney(row.expense, payload.currencyCode), formatMoney(row.cashFlow, payload.currencyCode)].map((text) => ({ text }))),
  ], {
    x: 0.7, y: 4.6, w: 8.6, h: 2.2, fontSize: 11, border: { type: "solid", color: "DCE5DF", pt: 1 }, fill: { color: "FFFFFF" }, color: "12271F",
    bold: false, rowH: 0.28,
  });
  const categorySlide = pptx.addSlide();
  categorySlide.background = { color: "F7F4EE" };
  categorySlide.addText("Top categories", { x: 0.7, y: 0.7, w: 5, h: 0.4, fontSize: 24, bold: true, color: "12271F" });
  categorySlide.addText(`Spending breakdown · ${payload.year}`, { x: 0.7, y: 1.2, w: 6, h: 0.25, fontSize: 12, color: "60766B" });
  categorySlide.addTable(categories.slice(0, 10).map((category) => [
    { text: category.name }, { text: formatMoney(category.total, payload.currencyCode) }, { text: `${category.count} transactions` },
  ]), {
    x: 0.7, y: 1.8, w: 8.6, h: 3.8, fontSize: 15, border: { type: "solid", color: "DCE5DF", pt: 1 },
    fill: { color: "FFFFFF" }, color: "12271F", rowH: 0.38,
  });
  await pptx.writeFile({ fileName: `nexus-analytics-${payload.year}-${fileDate()}.pptx` });
}

export async function generateAnalyticsExport(format: AnalyticsExportFormat, payload: AnalyticsExportPayload) {
  if (format === "xlsx") return exportXlsx(payload);
  if (format === "pdf") return exportPdf(payload);
  if (format === "pptx") return exportPptx(payload);
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `nexus-analytics-${payload.year}-${fileDate()}.json`);
}
