import winston from "winston";
import { env } from "../config/env";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  env.NODE_ENV === "development"
    ? winston.format.combine(winston.format.colorize(), winston.format.simple())
    : winston.format.json()
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  format: logFormat,
  defaultMeta: { service: "moneyos-api" },
  transports: [
    new winston.transports.Console(),
  ],
});
