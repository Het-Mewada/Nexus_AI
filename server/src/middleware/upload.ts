import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.memoryStorage();

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, WebP, HEIC, and PDF files are allowed."));
  }
};

export const uploadReceipt = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

export const uploadAttachments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 3, // Max 3 files
  },
});

export const uploadAvatar = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed for avatars."));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

export function generateFilePath(originalName: string, userId: string): string {
  const ext = path.extname(originalName);
  const uniqueName = `${uuidv4()}${ext}`;
  return `${userId}/${uniqueName}`;
}
