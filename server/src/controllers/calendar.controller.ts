import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { calendarService } from "../services/calendar.service";
import { sendSuccess, sendCreated } from "../utils/response";

export class CalendarController {
  async getEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.query;
      const events = await calendarService.getEvents(
        req.user!.id,
        month ? Number(month) : undefined,
        year ? Number(year) : undefined
      );
      sendSuccess(res, events, "Events retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async getEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const event = await calendarService.getEventById(req.params.id as string, req.user!.id);
      sendSuccess(res, event, "Event retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async createEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        date: new Date(req.body.date),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      const event = await calendarService.createEvent(req.user!.id, data);
      sendCreated(res, event, "Event created successfully");
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };
      if (data.date) data.date = new Date(data.date);
      if (data.endDate) data.endDate = new Date(data.endDate);
      
      const event = await calendarService.updateEvent(req.params.id as string, req.user!.id, data);
      sendSuccess(res, event, "Event updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await calendarService.deleteEvent(req.params.id as string, req.user!.id);
      sendSuccess(res, { message: "Event deleted" }, "Event deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const calendarController = new CalendarController();
