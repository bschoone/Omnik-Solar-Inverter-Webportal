import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const token = config.adminApiToken;
  if (!token) {
    res.status(503).json({ error: "ADMIN_API_TOKEN not configured" });
    return;
  }
  const header = req.headers["x-admin-token"];
  const auth = req.headers.authorization;
  let provided = typeof header === "string" ? header : "";
  if (auth?.startsWith("Bearer ")) provided = auth.slice(7);
  if (provided !== token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

export function requireBackupToken(req: Request, res: Response, next: NextFunction) {
  const token = config.backupApiToken;
  if (!token) {
    res.status(503).json({ error: "BACKUP_API_TOKEN not configured" });
    return;
  }
  const header = req.headers["x-backup-token"];
  const auth = req.headers.authorization;
  let provided = typeof header === "string" ? header : "";
  if (auth?.startsWith("Bearer ")) provided = auth.slice(7);
  if (provided !== token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
