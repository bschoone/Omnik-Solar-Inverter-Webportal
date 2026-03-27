import express from "express";
import type Database from "better-sqlite3";
import { apiReference } from "@scalar/express-api-reference";
import type { UnifiedCollector } from "./collector/unifiedCollector.js";
import { registerRoutes } from "./routes/registerRoutes.js";

export function createApp(db: Database.Database, collector: UnifiedCollector | null) {
  const app = express();
  app.disable("x-powered-by");

  registerRoutes(app, db, collector);

  app.use(
    "/documentation",
    apiReference({
      theme: "purple",
      url: "/openapi.json",
    }),
  );

  return app;
}
