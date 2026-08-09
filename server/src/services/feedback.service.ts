import { PrismaClient, Feedback } from "@prisma/client";
import { storageService } from "./storage.service";

const prisma = new PrismaClient();

export const feedbackService = {
  async create(data: {
    userId: string;
    type: string;
    title: string;
    description: string;
  }, files?: Express.Multer.File[]): Promise<Feedback> {
    
    let attachments: string[] = [];

    if (files && files.length > 0) {
      const uploadPromises = files.map(file => storageService.uploadReceipt(file, data.userId));
      const results = await Promise.all(uploadPromises);
      attachments = results.map(r => r.publicUrl);
    }

    return prisma.feedback.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        attachments: attachments,
      },
    });
  },

  async listByUser(userId: string): Promise<Feedback[]> {
    return prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async delete(id: string, userId: string): Promise<Feedback> {
    // Only allow users to delete their own feedback
    const feedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.userId !== userId) {
      throw new Error("Not authorized to delete this feedback");
    }

    return prisma.feedback.delete({
      where: { id },
    });
  },

  async updateStatus(id: string, status: string): Promise<Feedback> {
    // This could be restricted to admins later
    return prisma.feedback.update({
      where: { id },
      data: { status },
    });
  },
};
