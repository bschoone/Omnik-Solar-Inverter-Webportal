import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import BetterSqlite3 from "better-sqlite3";

export type SampleRow = {
  id?: number;
  ts: number;
  fetch_ok: number;
  power_w: number | null;
  energy_today_kwh: number | null;
  energy_total_kwh: number | null;
  serial: string | null;
  model: string | null;
  alarm_raw: string | null;
  version: string | null;
  m2m_mid: string | null;
  wan_ip: string | null;
  rssi: string | null;
  data_source: string | null;
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function openDatabase(dbPath: string): Database.Database {
  ensureDir(path.dirname(dbPath));
  const db = new BetterSqlite3(dbPath);
  db.pragma("journal_mode = WAL");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      fetch_ok INTEGER NOT NULL DEFAULT 1,
      power_w REAL,
      energy_today_kwh REAL,
      energy_total_kwh REAL,
      serial TEXT,
      model TEXT,
      alarm_raw TEXT,
      version TEXT,
      m2m_mid TEXT,
      wan_ip TEXT,
      rssi TEXT,
      data_source TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_samples_ts ON samples(ts);
  `);
  const cols = db.prepare(`PRAGMA table_info(samples)`).all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("data_source")) {
    db.exec(`ALTER TABLE samples ADD COLUMN data_source TEXT;`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS raw_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      data_source TEXT,
      peer_ip TEXT,
      payload BLOB,
      parse_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_raw_events_ts ON raw_events(ts);
  `);
}

export function insertSample(db: Database.Database, row: Record<string, unknown>, ok = true) {
  const ts = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO samples (
      ts, fetch_ok, power_w, energy_today_kwh, energy_total_kwh,
      serial, model, alarm_raw, version, m2m_mid, wan_ip, rssi, data_source
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    ts,
    ok ? 1 : 0,
    row["power_w"] ?? null,
    row["energy_today_kwh"] ?? null,
    row["energy_total_kwh"] ?? null,
    row["serial"] ?? null,
    row["model"] ?? null,
    row["alarm_raw"] ?? null,
    row["version"] ?? null,
    row["m2m_mid"] ?? null,
    row["wan_ip"] ?? null,
    row["rssi"] ?? null,
    row["data_source"] ?? null,
  );
}

export function insertRawEvent(
  db: Database.Database,
  opts: { dataSource: string; peerIp: string | null; payload: Buffer; parseError?: string },
) {
  const ts = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO raw_events (ts, data_source, peer_ip, payload, parse_error) VALUES (?,?,?,?,?)`,
  ).run(ts, opts.dataSource, opts.peerIp, opts.payload, opts.parseError ?? null);
}

export function pruneRawEvents(db: Database.Database, maxRows: number) {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM raw_events`).get() as { c: number };
  const excess = row.c - maxRows;
  if (excess <= 0) return;
  db.prepare(
    `DELETE FROM raw_events WHERE id IN (
      SELECT id FROM raw_events ORDER BY ts ASC LIMIT ?
    )`,
  ).run(excess);
}

export function latestSample(db: Database.Database): SampleRow | null {
  const r = db
    .prepare(
      `SELECT ts, fetch_ok, power_w, energy_today_kwh, energy_total_kwh,
              serial, model, alarm_raw, version, m2m_mid, wan_ip, rssi, data_source
       FROM samples WHERE fetch_ok = 1 ORDER BY ts DESC LIMIT 1`,
    )
    .get() as SampleRow | undefined;
  return r ?? null;
}

export function latestSampleForSource(db: Database.Database, dataSource: string): SampleRow | null {
  const r = db
    .prepare(
      `SELECT ts, fetch_ok, power_w, energy_today_kwh, energy_total_kwh,
              serial, model, alarm_raw, version, m2m_mid, wan_ip, rssi, data_source
       FROM samples WHERE fetch_ok = 1 AND data_source = ? ORDER BY ts DESC LIMIT 1`,
    )
    .get(dataSource) as SampleRow | undefined;
  return r ?? null;
}

export function historyBuckets(db: Database.Database, days: number, bucketSec: number) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(days * 86400);
  const bs = Math.max(1, bucketSec);
  return db
    .prepare(
      `SELECT
        (ts / ?) * ? AS bucket_start,
        AVG(power_w) AS power_w_avg,
        MAX(power_w) AS power_w_max,
        COUNT(*) AS n
       FROM samples
       WHERE fetch_ok = 1 AND ts >= ? AND ts <= ? AND power_w IS NOT NULL
       GROUP BY bucket_start
       ORDER BY bucket_start`,
    )
    .all(bs, bs, start, now) as { bucket_start: number; power_w_avg: number; power_w_max: number; n: number }[];
}

export function historyBucketsBySource(db: Database.Database, days: number, bucketSec: number, sources: string[]) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(days * 86400);
  const bs = Math.max(1, bucketSec);
  if (sources.length === 0) return { bucket_starts: [] as number[], series: {} as Record<string, (number | null)[]> };
  const placeholders = sources.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT
        (ts / ?) * ? AS bucket_start,
        data_source,
        AVG(power_w) AS power_w_avg
       FROM samples
       WHERE fetch_ok = 1 AND ts >= ? AND ts <= ? AND power_w IS NOT NULL
         AND data_source IN (${placeholders})
       GROUP BY bucket_start, data_source
       ORDER BY bucket_start`,
    )
    .all(bs, bs, start, now, ...sources) as { bucket_start: number; data_source: string; power_w_avg: number }[];

  const byBucket = new Map<number, Map<string, number>>();
  for (const r of rows) {
    let m = byBucket.get(r.bucket_start);
    if (!m) {
      m = new Map();
      byBucket.set(r.bucket_start, m);
    }
    m.set(r.data_source, r.power_w_avg);
  }
  const bucketStarts = [...byBucket.keys()].sort((a, b) => a - b);
  const series: Record<string, (number | null)[]> = {};
  for (const s of sources) series[s] = [];
  for (const b of bucketStarts) {
    const m = byBucket.get(b)!;
    for (const s of sources) {
      const v = m.get(s);
      series[s]!.push(v !== undefined ? v : null);
    }
  }
  return { bucket_starts: bucketStarts, series };
}

export type EnergyBucketRow = {
  bucket_start: number;
  energy_today_kwh: number | null;
  energy_total_kwh: number | null;
};

/** Last sample in each time bucket (by max ts), successful fetches only. */
export function energyLastPerBucket(db: Database.Database, days: number, bucketSec: number): EnergyBucketRow[] {
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(days * 86400);
  const bs = Math.max(1, bucketSec);
  return db
    .prepare(
      `WITH ranked AS (
        SELECT
          (ts / ?) * ? AS bucket_start,
          energy_today_kwh,
          energy_total_kwh,
          ROW_NUMBER() OVER (
            PARTITION BY (ts / ?) * ?
            ORDER BY ts DESC, rowid DESC
          ) AS rn
        FROM samples
        WHERE fetch_ok = 1 AND ts >= ? AND ts <= ?
      )
      SELECT bucket_start, energy_today_kwh, energy_total_kwh
      FROM ranked
      WHERE rn = 1 AND (energy_today_kwh IS NOT NULL OR energy_total_kwh IS NOT NULL)
      ORDER BY bucket_start`,
    )
    .all(bs, bs, bs, bs, start, now) as EnergyBucketRow[];
}

export type IngestionBucketRow = {
  bucket_start: number;
  n: number;
  n_ok: number;
  n_fail: number;
  power_w_avg_ok: number | null;
};

/** All samples per bucket: counts, failures, optional avg power on ok rows. */
export function ingestionQualityBuckets(db: Database.Database, days: number, bucketSec: number): IngestionBucketRow[] {
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(days * 86400);
  const bs = Math.max(1, bucketSec);
  return db
    .prepare(
      `SELECT
        (ts / ?) * ? AS bucket_start,
        COUNT(*) AS n,
        SUM(fetch_ok) AS n_ok,
        COUNT(*) - SUM(fetch_ok) AS n_fail,
        AVG(CASE WHEN fetch_ok = 1 THEN power_w END) AS power_w_avg_ok
       FROM samples
       WHERE ts >= ? AND ts <= ?
       GROUP BY bucket_start
       ORDER BY bucket_start`,
    )
    .all(bs, bs, start, now) as IngestionBucketRow[];
}

export type PowerHistogramBin = {
  bin_start: number;
  bin_end: number;
  count: number;
};

export function powerHistogram(db: Database.Database, days: number, binCount: number): PowerHistogramBin[] {
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(days * 86400);
  const bc = Math.min(48, Math.max(4, Math.floor(binCount)));
  const bounds = db
    .prepare(
      `SELECT MIN(power_w) AS lo, MAX(power_w) AS hi, COUNT(*) AS c
       FROM samples
       WHERE fetch_ok = 1 AND power_w IS NOT NULL AND ts >= ? AND ts <= ?`,
    )
    .get(start, now) as { lo: number | null; hi: number | null; c: number };
  if (!bounds.c || bounds.lo == null || bounds.hi == null) return [];

  let lo = bounds.lo;
  let hi = bounds.hi;
  if (lo === hi) {
    return [{ bin_start: lo, bin_end: hi, count: bounds.c }];
  }
  const width = (hi - lo) / bc;
  const maxBin = bc - 1;
  const rows = db
    .prepare(
      `SELECT bin_idx, COUNT(*) AS cnt FROM (
        SELECT MIN(CAST((power_w - ?) / ? AS INTEGER), ?) AS bin_idx
        FROM samples
        WHERE fetch_ok = 1 AND power_w IS NOT NULL AND ts >= ? AND ts <= ?
      )
      GROUP BY bin_idx
      ORDER BY bin_idx`,
    )
    .all(lo, width, maxBin, start, now) as { bin_idx: number; cnt: number }[];

  return rows.map((r) => {
    const b0 = lo + r.bin_idx * width;
    const b1 = r.bin_idx === bc - 1 ? hi : lo + (r.bin_idx + 1) * width;
    return { bin_start: b0, bin_end: b1, count: r.cnt };
  });
}

export type HourlyDowCell = {
  dow: number;
  hour: number;
  avg_power_w: number;
  n: number;
};

export function hourlyDowAverages(db: Database.Database, days: number): HourlyDowCell[] {
  const now = Math.floor(Date.now() / 1000);
  const start = now - Math.floor(days * 86400);
  return db
    .prepare(
      `SELECT
        CAST(strftime('%w', ts, 'unixepoch') AS INTEGER) AS dow,
        CAST(strftime('%H', ts, 'unixepoch') AS INTEGER) AS hour,
        AVG(power_w) AS avg_power_w,
        COUNT(*) AS n
       FROM samples
       WHERE fetch_ok = 1 AND power_w IS NOT NULL AND ts >= ? AND ts <= ?
       GROUP BY dow, hour
       ORDER BY dow, hour`,
    )
    .all(start, now) as HourlyDowCell[];
}

export function listSamples(
  db: Database.Database,
  opts: { fromTs?: number; toTs?: number; source?: string; limit: number; offset: number },
) {
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];
  if (opts.fromTs !== undefined) {
    clauses.push("ts >= ?");
    params.push(opts.fromTs);
  }
  if (opts.toTs !== undefined) {
    clauses.push("ts <= ?");
    params.push(opts.toTs);
  }
  if (opts.source) {
    clauses.push("data_source = ?");
    params.push(opts.source);
  }
  const where = clauses.join(" AND ");
  const rows = db
    .prepare(
      `SELECT id, ts, fetch_ok, power_w, energy_today_kwh, energy_total_kwh,
              serial, model, alarm_raw, version, m2m_mid, wan_ip, rssi, data_source
       FROM samples WHERE ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, opts.limit, opts.offset) as SampleRow[];
  return rows;
}

export function listRawEvents(
  db: Database.Database,
  opts: { fromTs?: number; toTs?: number; limit: number; offset: number },
) {
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];
  if (opts.fromTs !== undefined) {
    clauses.push("ts >= ?");
    params.push(opts.fromTs);
  }
  if (opts.toTs !== undefined) {
    clauses.push("ts <= ?");
    params.push(opts.toTs);
  }
  const where = clauses.join(" AND ");
  return db
    .prepare(
      `SELECT id, ts, data_source, peer_ip,
              LENGTH(payload) AS payload_length,
              LOWER(hex(payload)) AS payload_hex,
              parse_error
       FROM raw_events WHERE ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, opts.limit, opts.offset) as Record<string, unknown>[];
}

export function distinctSources(db: Database.Database) {
  return db
    .prepare(
      `SELECT data_source AS source, MAX(ts) AS last_ts FROM samples WHERE fetch_ok = 1 AND data_source IS NOT NULL GROUP BY data_source`,
    )
    .all() as { source: string; last_ts: number }[];
}

/** Row counts + light pragma info */
export function dbStats(db: Database.Database) {
  const samples = (db.prepare(`SELECT COUNT(*) AS c FROM samples`).get() as { c: number }).c;
  const rawEvents = (db.prepare(`SELECT COUNT(*) AS c FROM raw_events`).get() as { c: number }).c;
  const pageCount = Number(db.pragma("page_count", { simple: true }));
  const pageSize = Number(db.pragma("page_size", { simple: true }));
  return {
    samples_count: samples,
    raw_events_count: rawEvents,
    sqlite_page_count: pageCount,
    sqlite_page_size: pageSize,
    sqlite_size_bytes_approx: pageCount * pageSize,
  };
}

export function deleteSamplesBefore(db: Database.Database, beforeTs: number) {
  return db.prepare(`DELETE FROM samples WHERE ts < ?`).run(beforeTs).changes;
}

export function deleteSamplesBySource(db: Database.Database, source: string) {
  return db.prepare(`DELETE FROM samples WHERE data_source = ?`).run(source).changes;
}

export function truncateSamples(db: Database.Database) {
  db.exec(`DELETE FROM samples;`);
}

export function truncateRawEvents(db: Database.Database) {
  db.exec(`DELETE FROM raw_events;`);
}

export function deleteRawEventsBefore(db: Database.Database, beforeTs: number) {
  return db.prepare(`DELETE FROM raw_events WHERE ts < ?`).run(beforeTs).changes;
}

export function runVacuum(db: Database.Database) {
  db.exec("VACUUM;");
}