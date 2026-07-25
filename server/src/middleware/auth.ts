import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    supabaseId: string;
    email: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header",
        },
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user: supabaseUser },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        },
      });
      return;
    }

    let dbUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        },
      });

      await prisma.userSettings.create({
        data: { userId: dbUser.id },
      });

      logger.info(`New user synced: ${dbUser.email}`);
    }

    if (dbUser.deletedAt) {
      res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_DELETED",
          message: "This account has been deleted",
        },
      });
      return;
    }

    req.user = {
      id: dbUser.id,
      supabaseId: dbUser.supabaseId,
      email: dbUser.email,
    };

    next();
  } catch (err) {
    logger.error("Auth middleware error:", err);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Authentication failed",
      },
    });
  }
}
