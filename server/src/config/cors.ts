import cors from "cors";
import { env } from "./env";

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(null, env.CLIENT_URL);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
};
