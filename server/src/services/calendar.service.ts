import { prisma } from "../config/database";
import { AppError } from "../middleware/errorHandler";

const UN_AWARENESS_DAYS = [
  { name: "Valentine's Day", month: 2, day: 14, color: "#ec4899" },
  { name: "International Women's Day", month: 3, day: 8, color: "#8b5cf6" },
  { name: "World Health Day", month: 4, day: 7, color: "#3b82f6" },
  { name: "Earth Day", month: 4, day: 22, color: "#22c55e" },
  { name: "World Environment Day", month: 6, day: 5, color: "#10b981" },
  { name: "International Yoga Day", month: 6, day: 21, color: "#06b6d4" },
  { name: "Halloween", month: 10, day: 31, color: "#f97316" },
];

const holidayCache = new Map<number, any[]>();

async function fetchDynamicHolidays(year: number) {
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }

  try {
    // Using Nager.Date API for free public holidays (no API key required)
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/US`);
    if (!response.ok) throw new Error("Failed to fetch public holidays");
    
    const publicHolidays = (await response.json()) as any[];
    
    const dynamicEvents = publicHolidays.map((h: any, i: number) => {
      // API returns date in YYYY-MM-DD format
      const date = new Date(`${h.date}T09:00:00`);
      return {
        id: `dynamic-holiday-${year}-${i}`,
        userId: "global",
        title: h.name,
        description: `Public Holiday: ${h.name} (${h.localName})`,
        date: date,
        endDate: date,
        isAllDay: true,
        type: "HOLIDAY",
        recurrence: "YEARLY",
        color: "#f59e0b", // Amber for public holidays
        createdAt: new Date(),
        updatedAt: new Date(),
        reminders: [
          {
            id: `reminder-dynamic-${year}-${i}`,
            eventId: `dynamic-holiday-${year}-${i}`,
            minutesBefore: 1440, // 24 hours
            isSent: false,
            createdAt: new Date()
          }
        ]
      };
    });

    holidayCache.set(year, dynamicEvents);
    return dynamicEvents;
  } catch (error) {
    console.error("Error fetching dynamic holidays:", error);
    return []; // Return empty array if API fails, fallback to UN days
  }
}

function getAwarenessDaysForYear(year: number) {
  return UN_AWARENESS_DAYS.map((h, i) => {
    // Return an ISO string that will be parsed as local time by the frontend
    const month = h.month.toString().padStart(2, '0');
    const day = h.day.toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}T09:00:00`;
    const date = new Date(dateStr);
    return {
      id: `awareness-day-${year}-${i}`,
      userId: "global",
      title: h.name,
      description: `Global Event: ${h.name}`,
      date: date,
      endDate: date,
      isAllDay: true,
      type: "HOLIDAY",
      recurrence: "YEARLY",
      color: h.color,
      createdAt: new Date(),
      updatedAt: new Date(),
      reminders: [
        {
          id: `reminder-awareness-${year}-${i}`,
          eventId: `awareness-day-${year}-${i}`,
          minutesBefore: 1440, // 24 hours
          isSent: false,
          createdAt: new Date()
        }
      ]
    };
  });
}

export class CalendarService {
  async getEvents(userId: string, month?: number, year?: number) {
    let whereClause: any = { userId };
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      
      whereClause.OR = [
        {
          date: { gte: startDate, lte: endDate },
          recurrence: "NONE"
        },
        {
          date: { lte: endDate },
          recurrence: { not: "NONE" }
        }
      ];
    }

    const dbEvents = await prisma.event.findMany({
      where: whereClause,
      include: { reminders: true }
    });

    const userEvents = this.expandRecurringEvents(dbEvents, startDate, endDate);

    const targetYear = year || new Date().getFullYear();
    
    // Fetch dynamic public holidays and static awareness days
    const publicHolidays = await fetchDynamicHolidays(targetYear);
    const awarenessDays = getAwarenessDaysForYear(targetYear);
    
    let globalEvents = [...publicHolidays, ...awarenessDays];

    if (month) {
      globalEvents = globalEvents.filter(e => e.date.getUTCMonth() + 1 === month);
    }

    return [...userEvents, ...globalEvents];
  }

  private expandRecurringEvents(events: any[], viewStart?: Date, viewEnd?: Date) {
    if (!viewStart || !viewEnd) return events; // Fallback if no bounds
    
    const expanded: any[] = [];
    
    for (const event of events) {
      if (event.recurrence === "NONE") {
        expanded.push(event);
        continue;
      }

      let currentStart = new Date(event.date);
      let currentEnd = event.endDate ? new Date(event.endDate) : new Date(event.date);
      const duration = currentEnd.getTime() - currentStart.getTime();

      let iterations = 0;
      // Fast forward and populate events within the view frame
      while (currentStart <= viewEnd && iterations < 500) { // max 500 safety limit
        if (currentStart >= viewStart) {
          expanded.push({
            ...event,
            id: `${event.id}-recur-${iterations}`, // virtual ID for duplicates
            date: new Date(currentStart),
            endDate: new Date(currentStart.getTime() + duration)
          });
        }

        // Increment based on recurrence type
        if (event.recurrence === "DAILY") {
          currentStart.setDate(currentStart.getDate() + 1);
        } else if (event.recurrence === "WEEKLY") {
          currentStart.setDate(currentStart.getDate() + 7);
        } else if (event.recurrence === "MONTHLY") {
          currentStart.setMonth(currentStart.getMonth() + 1);
        } else if (event.recurrence === "YEARLY") {
          currentStart.setFullYear(currentStart.getFullYear() + 1);
        } else {
          break; // Unknown recurrence type fallback
        }
        iterations++;
      }
    }
    
    return expanded;
  }

  async getEventById(id: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { reminders: true }
    });

    if (!event || event.userId !== userId) {
      throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");
    }

    return event;
  }

  async createEvent(userId: string, data: {
    title: string;
    description?: string;
    date: Date;
    endDate?: Date;
    isAllDay?: boolean;
    type?: string;
    recurrence?: string;
    color?: string;
    reminders?: number[]; // minutes before
  }) {
    return prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          userId,
          title: data.title,
          description: data.description,
          date: data.date,
          endDate: data.endDate,
          isAllDay: data.isAllDay || false,
          type: data.type || "CUSTOM",
          recurrence: data.recurrence || "NONE",
          color: data.color
        }
      });

      if (data.reminders && data.reminders.length > 0) {
        const reminderData = data.reminders.map(minutes => ({
          eventId: event.id,
          minutesBefore: minutes,
        }));
        await tx.eventReminder.createMany({
          data: reminderData
        });
      }

      return tx.event.findUnique({
        where: { id: event.id },
        include: { reminders: true }
      });
    });
  }

  async updateEvent(id: string, userId: string, data: any) {
    await this.getEventById(id, userId); // verify ownership

    return prisma.$transaction(async (tx) => {
      const event = await tx.event.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          date: data.date,
          endDate: data.endDate,
          isAllDay: data.isAllDay,
          type: data.type,
          recurrence: data.recurrence,
          color: data.color
        }
      });

      if (data.reminders !== undefined) {
        await tx.eventReminder.deleteMany({
          where: { eventId: id }
        });

        if (data.reminders.length > 0) {
          const reminderData = data.reminders.map((minutes: number) => ({
            eventId: event.id,
            minutesBefore: minutes,
          }));
          await tx.eventReminder.createMany({
            data: reminderData
          });
        }
      }

      return tx.event.findUnique({
        where: { id },
        include: { reminders: true }
      });
    });
  }

  async deleteEvent(id: string, userId: string) {
    await this.getEventById(id, userId); // verify ownership
    await prisma.event.delete({ where: { id } });
    return { success: true };
  }
}

export const calendarService = new CalendarService();
