import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { adminService } from "../services/admin.service";
import { feedbackService } from "../services/feedback.service";
import { logger } from "../utils/logger";
import { supabaseAdmin } from "../config/supabase";
import { prisma } from "../config/database";

export const adminController = {
  async getStats(req: AuthRequest, res: Response) {
    try {
      const stats = await adminService.getGlobalStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error("Admin stats error:", error);
      res.status(500).json({ success: false, error: { message: "Failed to fetch stats" } });
    }
  },

  async listUsers(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;

      const data = await adminService.listUsers(page, limit, search);
      res.json({ success: true, data });
      return;
    } catch (error) {
      logger.error("Admin list users error:", error);
      res.status(500).json({ success: false, error: { message: "Failed to fetch users" } });
    }
  },

  async updateUserStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["ACTIVE", "SUSPENDED"].includes(status)) {
        res.status(400).json({ success: false, error: { message: "Invalid status" } });
        return;
      }

      const user = await adminService.updateUserStatus(id as string, status as "ACTIVE" | "SUSPENDED");
      res.json({ success: true, data: user });
      return;
    } catch (error) {
      logger.error("Admin update user error:", error);
      res.status(500).json({ success: false, error: { message: "Failed to update user" } });
    }
  },

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // We should also delete the user from Supabase auth
      const dbUser = await prisma.user.findUnique({ where: { id: id as string } });
      if (dbUser) {
        await supabaseAdmin.auth.admin.deleteUser(dbUser.supabaseId);
      }

      await adminService.deleteUser(id as string);
      res.json({ success: true, data: { message: "User deleted" } });
      return;
    } catch (error) {
      logger.error("Admin delete user error:", error);
      res.status(500).json({ success: false, error: { message: "Failed to delete user" } });
    }
  },

  async listFeedbacks(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      const data = await adminService.listFeedbacks(page, limit, status);
      res.json({ success: true, data });
      return;
    } catch (error) {
      logger.error("Admin list feedbacks error:", error);
      res.status(500).json({ success: false, error: { message: "Failed to fetch feedbacks" } });
    }
  },

  async updateFeedbackStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"].includes(status)) {
        res.status(400).json({ success: false, error: { message: "Invalid status" } });
        return;
      }

      const feedback = await adminService.updateFeedbackStatus(id as string, status);
      res.json({ success: true, data: feedback });
      return;
    } catch (error) {
      logger.error("Admin update feedback error:", error);
      res.status(500).json({ success: false, error: { message: "Failed to update feedback" } });
    }
  },

  async addFeedbackReply(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      if (!message) {
        res.status(400).json({ success: false, error: { message: "Message is required" } });
        return;
      }

      const reply = await feedbackService.addReply(id as string, req.user!.id, message);
      res.status(201).json({ success: true, data: reply });
      return;
    } catch (error: any) {
      if (error.message.includes("not found") || error.message.includes("Cannot reply")) {
        res.status(400).json({ success: false, error: { message: error.message } });
        return;
      }
      logger.error("Admin add feedback reply error:", error);
      res.status(500).json({ success: false, error: { message: "Failed to add reply" } });
    }
  }
};
