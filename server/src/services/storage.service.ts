import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env";
import { generateFilePath } from "../middleware/upload";
import { logger } from "../utils/logger";

export class StorageService {
  async uploadReceipt(file: Express.Multer.File, userId: string) {
    const filePath = generateFilePath(file.originalname, userId);

    const { error } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      logger.error("Storage upload failed:", error);
      throw new Error("Failed to upload receipt");
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(env.STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      publicUrl: urlData.publicUrl,
    };
  }

  async deleteReceipt(filePath: string) {
    const { error } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.error("Storage delete failed:", error);
    }
  }
}

export const storageService = new StorageService();
