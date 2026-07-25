import { Router } from "express";
import { calendarController } from "../controllers/calendar.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware as any);

router.get("/", (req, res, next) => calendarController.getEvents(req as any, res, next));
router.post("/", (req, res, next) => calendarController.createEvent(req as any, res, next));
router.get("/:id", (req, res, next) => calendarController.getEvent(req as any, res, next));
router.patch("/:id", (req, res, next) => calendarController.updateEvent(req as any, res, next));
router.put("/:id", (req, res, next) => calendarController.updateEvent(req as any, res, next));
router.delete("/:id", (req, res, next) => calendarController.deleteEvent(req as any, res, next));

export default router;
