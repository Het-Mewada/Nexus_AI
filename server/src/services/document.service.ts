import { prisma } from '../config/database';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class DocumentService {
  async uploadDocument(userId: string, file: Express.Multer.File, type: any, title: string) {
    try {
      const fileName = `${userId}/${Date.now()}-${file.originalname}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from(env.STORAGE_BUCKET)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(env.STORAGE_BUCKET)
        .getPublicUrl(fileName);

      const document = await prisma.document.create({
        data: {
          userId,
          name: file.originalname,
          title,
          type,
          fileUrl: publicUrlData.publicUrl,
          filePath: fileName,
        }
      });

      return document;
    } catch (error: any) {
      logger.error('Failed to upload document', { error, userId });
      throw error;
    }
  }

  async getDocuments(userId: string) {
    return prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteDocument(userId: string, id: string) {
    const document = await prisma.document.findUnique({
      where: { id, userId }
    });

    if (!document) throw new Error('Document not found');

    if (document.filePath) {
      const { error } = await supabaseAdmin.storage
        .from(env.STORAGE_BUCKET)
        .remove([document.filePath]);
        
      if (error) {
        logger.error('Failed to delete file from Supabase storage', { error, path: document.filePath });
      }
    }

    await prisma.document.delete({
      where: { id }
    });

    return { success: true };
  }
}

export const documentService = new DocumentService();
