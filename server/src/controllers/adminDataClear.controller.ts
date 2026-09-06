import { Request, Response } from "express";
import { dataClearService } from "../services/dataClear.service";

export class AdminDataClearController {
  async clearUserData(req: Request, res: Response): Promise<void> {
    try {
      const { email, features, confirmDelete, confirmEmail, includeSyncedContacts } = req.body;

      if (!email || typeof email !== "string") {
        res.status(400).json({ error: "Target user email is required" });
        return;
      }

      if (confirmDelete && confirmEmail?.toLowerCase() !== email.toLowerCase()) {
        res.status(400).json({ error: "Confirmation email match failed. Deletion aborted for safety." });
        return;
      }

      const report = await dataClearService.processClearRequest({
        userEmail: email,
        features: features || {},
        confirmDelete: Boolean(confirmDelete),
        includeSyncedContacts: Boolean(includeSyncedContacts),
      });

      res.json({
        message: report.executed
          ? "User data clear executed successfully"
          : "User data clear dry run complete",
        report,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to process data clear request" });
    }
  }
}

export const adminDataClearController = new AdminDataClearController();
