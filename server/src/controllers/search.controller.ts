import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/database";
import { sendSuccess } from "../utils/response";

export class SearchController {
  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { q, type = "all", limit: limitStr } = req.query as Record<string, string>;
      const userId = req.user!.id;
      const limit = Math.min(50, parseInt(limitStr || "20", 10));
      const searchTerm = q.trim();

      const results: {
        incomes: unknown[];
        expenses: unknown[];
      } = { incomes: [], expenses: [] };

      if (type === "all" || type === "income") {
        results.incomes = await prisma.income.findMany({
          where: {
            userId,
            deletedAt: null,
            OR: [
              { source: { contains: searchTerm, mode: "insensitive" } },
              { notes: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          orderBy: { date: "desc" },
          take: limit,
        });
      }

      if (type === "all" || type === "expense") {
        results.expenses = await prisma.expense.findMany({
          where: {
            userId,
            deletedAt: null,
            OR: [
              { merchant: { contains: searchTerm, mode: "insensitive" } },
              { notes: { contains: searchTerm, mode: "insensitive" } },
              { tags: { hasSome: [searchTerm] } },
              { category: { name: { contains: searchTerm, mode: "insensitive" } } },
            ],
          },
          include: { category: true },
          orderBy: { date: "desc" },
          take: limit,
        });
      }

      sendSuccess(res, results, "Search results retrieved");
    } catch (error) {
      next(error);
    }
  }
}

export const searchController = new SearchController();
