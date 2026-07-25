import { Response } from "express";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess(
  res: Response,
  data: unknown,
  message: string = "Success",
  statusCode: number = 200,
  meta?: PaginationMeta
): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    ...(meta ? { meta } : {}),
  });
}

export function sendCreated(res: Response, data: unknown, message: string = "Created successfully"): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated(
  res: Response,
  data: unknown,
  total: number,
  page: number,
  limit: number,
  message: string = "Success"
): void {
  sendSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export function parsePaginationQuery(query: { page?: string; limit?: string }): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function parseSort(
  sortBy?: string,
  sortOrder?: string,
  allowedFields: string[] = ["createdAt", "date", "amount"]
): { field: string; order: "asc" | "desc" } {
  const field = sortBy && allowedFields.includes(sortBy) ? sortBy : "date";
  const order = sortOrder === "asc" ? "asc" : "desc";
  return { field, order };
}
