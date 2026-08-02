import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { exportService } from "../services/export.service";

export class ExportController {
  async exportCSV(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const csv = await exportService.exportCSV(req.user!.id);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=nexus-export-${new Date().toISOString().split("T")[0]}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export const exportController = new ExportController();
