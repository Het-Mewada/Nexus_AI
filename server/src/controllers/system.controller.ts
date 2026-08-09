import { Request, Response } from "express";
import { systemService } from "../services/system.service";

export const systemController = {
  getSettings: async (req: Request, res: Response) => {
    try {
      const features = await systemService.getSettings();
      res.json({ success: true, data: { features } });
    } catch (error) {
      console.error("Get system settings error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch settings" });
    }
  },

  updateSettings: async (req: Request, res: Response) => {
    try {
      const { features } = req.body;
      if (!features) {
        res.status(400).json({ success: false, error: "Features object is required" });
        return;
      }

      const updatedFeatures = await systemService.updateSettings(features);
      res.json({ success: true, data: { features: updatedFeatures } });
      return;
    } catch (error) {
      console.error("Update system settings error:", error);
      res.status(500).json({ success: false, error: "Failed to update settings" });
    }
  }
};
