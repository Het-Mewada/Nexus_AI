import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";
import { prisma } from "../config/database";
import { logger } from "../utils/logger";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    supabaseId: string;
    email: string;
    role: string;
    status: string;
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

    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseId: supabaseUser.id },
          { email: supabaseUser.email!.toLowerCase() },
        ],
      },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email!.toLowerCase(),
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        },
      });

      await prisma.userSettings.upsert({
        where: { userId: dbUser.id },
        create: { userId: dbUser.id },
        update: {},
      });

      logger.info(`New user synced: ${dbUser.email}`);
    } else if (dbUser.supabaseId !== supabaseUser.id) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { supabaseId: supabaseUser.id },
      });
    }

    // Ensure settings exist for the user
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: dbUser.id },
    });
    if (!existingSettings) {
      await prisma.userSettings.create({
        data: { userId: dbUser.id },
      });
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

    if (dbUser.status === "SUSPENDED") {
      res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_SUSPENDED",
          message: "This account has been suspended",
        },
      });
      return;
    }

    req.user = {
      id: dbUser.id,
      supabaseId: dbUser.supabaseId,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
    };

    next();
  } catch (err: any) {
    logger.error("Auth middleware error:", err?.message || err, err?.stack);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err?.message || "Authentication failed",
      },
    });
  }
}


export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authMiddleware(req, res, next);
  }
  next();
}


