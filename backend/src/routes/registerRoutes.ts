import type { Express } from "express";
import express from "express";
import type Database from "better-sqlite3";
import type { UnifiedCollector } from "../collector/unifiedCollector.js";
import {
  latestSample,
  latestSampleForSource,
  historyBuckets,
  historyBucketsBySource,
  energyLastPerBucket,
  ingestionQualityBuckets,
  powerHistogram,
  hourlyDowAverages,
  listSamples,
  listRawEvents,
  distinctSources,
  dbStats,
  deleteSamplesBefore,
  deleteSamplesBySource,
  truncateSamples,
  truncateRawEvents,
  deleteRawEventsBefore,
  runVacuum,
} from "../db/database.js";
import { requireAdminToken, requireBackupToken } from "../middleware/adminAuth.js";
import { backupDatabase } from "../db/backup.js";
import { config } from "../config.js";
import { buildOpenApiSpec } from "../openapi/buildSpec.js";
import { clampBucketSeconds, clampChartDays, clampHistogramBins } from "../chartConstants.js";

export function registerRoutes(app: Express, db: Database.Database, collector: UnifiedCollector | null) {
  const api = express.Router();
  api.use(express.json({ limit: "256kb" }));

  api.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  api.get("/current", (_req, res) => {
    const sample = latestSample(db);
    const by_source = {
      tcp_push: latestSampleForSource(db, "tcp_push"),
      tcp_pull: latestSampleForSource(db, "tcp_pull"),
    };
    res.json({ sample, by_source });
  });

  api.get("/history", (req, res) => {
    const days = clampChartDays(parseFloat(String(req.query.days ?? "7")) || 7);
    const bucket_seconds = clampBucketSeconds(parseInt(String(req.query.bucket_seconds ?? "10"), 10) || 10);
    const points = historyBuckets(db, days, bucket_seconds);
    const fromDb = distinctSources(db).map((r) => r.source);
    const defaultSources = ["tcp_push", "tcp_pull", "http_fallback"];
    const sourcesForSeries = [...new Set([...defaultSources, ...fromDb])];
    const source_series = historyBucketsBySource(db, days, bucket_seconds, sourcesForSeries);
    res.json({ days, bucket_seconds, points, source_series });
  });

  api.get("/analytics/dashboard", (req, res) => {
    const days = clampChartDays(parseFloat(String(req.query.days ?? "7")) || 7);
    const bucket_seconds = clampBucketSeconds(parseInt(String(req.query.bucket_seconds ?? "600"), 10) || 600);
    const histogram_bins = clampHistogramBins(parseInt(String(req.query.histogram_bins ?? "24"), 10) || 24);
    const energy = energyLastPerBucket(db, days, bucket_seconds);
    const ingestion = ingestionQualityBuckets(db, days, bucket_seconds);
    const power_histogram = powerHistogram(db, days, histogram_bins);
    const hourly_profile = hourlyDowAverages(db, days);
    res.json({
      days,
      bucket_seconds,
      histogram_bins,
      energy,
      ingestion,
      power_histogram,
      hourly_profile,
    });
  });

  api.post("/poll", async (_req, res) => {
    if (!collector) {
      res.status(503).json({ ok: false, error: "collector not running" });
      return;
    }
    const r = await collector.pollNow();
    if (!r.ok) res.status(500).json(r);
    else res.json(r);
  });

  api.get("/samples", (req, res) => {
    const from = req.query.from !== undefined ? parseInt(String(req.query.from), 10) : undefined;
    const to = req.query.to !== undefined ? parseInt(String(req.query.to), 10) : undefined;
    const source = req.query.source !== undefined ? String(req.query.source) : undefined;
    const limit = Math.min(5000, Math.max(1, parseInt(String(req.query.limit ?? "100"), 10) || 100));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
    const rows = listSamples(db, { fromTs: from, toTs: to, source, limit, offset });
    res.json({ rows, limit, offset });
  });

  api.get("/sources", (_req, res) => {
    res.json({ sources: distinctSources(db) });
  });

  api.get("/raw-events", (req, res) => {
    if (!config.rawEventLogEnable) {
      res.status(404).json({ error: "RAW_EVENT_LOG_ENABLE is off" });
      return;
    }
    const from = req.query.from !== undefined ? parseInt(String(req.query.from), 10) : undefined;
    const to = req.query.to !== undefined ? parseInt(String(req.query.to), 10) : undefined;
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
    const rows = listRawEvents(db, { fromTs: from, toTs: to, limit, offset });
    res.json({ rows, limit, offset });
  });

  const admin = express.Router();

  admin.get("/db/stats", requireAdminToken, (_req, res) => {
    res.json(dbStats(db));
  });

  admin.post("/db/purge-samples", requireAdminToken, (req, res) => {
    const body = req.body as {
      before_ts?: number;
      source?: string;
      all?: boolean;
      confirm?: string;
    };
    let deleted = 0;
    if (body.all === true) {
      if (body.confirm !== "DELETE_SAMPLES") {
        res.status(400).json({ error: 'confirm must be "DELETE_SAMPLES" when all=true' });
        return;
      }
      truncateSamples(db);
      deleted = -1;
    } else if (body.before_ts !== undefined) {
      deleted = deleteSamplesBefore(db, body.before_ts);
    } else if (body.source) {
      deleted = deleteSamplesBySource(db, body.source);
    } else {
      res.status(400).json({ error: "specify before_ts, source, or all+confirm" });
      return;
    }
    res.json({ ok: true, deleted });
  });

  admin.post("/db/purge-raw-events", requireAdminToken, (req, res) => {
    const body = req.body as { all?: boolean; before_ts?: number };
    let n = 0;
    if (body.all) {
      truncateRawEvents(db);
      n = -1;
    } else if (body.before_ts !== undefined) {
      n = deleteRawEventsBefore(db, body.before_ts);
    } else {
      res.status(400).json({ error: "specify all:true or before_ts" });
      return;
    }
    res.json({ ok: true, deleted: n });
  });

  admin.post("/db/vacuum", requireAdminToken, (_req, res) => {
    runVacuum(db);
    res.json({ ok: true });
  });

  admin.post("/backup", requireBackupToken, async (_req, res) => {
    try {
      const p = await backupDatabase(db, config.backupDir, config.backupKeep);
      res.json({ ok: true, path: p });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  api.use("/admin", admin);

  app.use("/api", api);

  const spec = buildOpenApiSpec();
  app.get("/openapi.json", (_req, res) => {
    res.json(spec);
  });

  app.get("/", (_req, res) => {
    res.redirect(302, "/documentation");
  });
}
