export function getLocalDateString(date: Date = new Date(), timeZone: string = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // Formats as YYYY-MM-DD
  } catch (error) {
    return date.toISOString().split("T")[0]!;
  }
}
