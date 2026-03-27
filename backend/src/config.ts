import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function env(name: string, defaultVal: string): string {
  const v = process.env[name];
  return v !== undefined && v !== "" ? v : defaultVal;
}

function envInt(name: string, defaultVal: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultVal;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : defaultVal;
}

function envFloat(name: string, defaultVal: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultVal;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : defaultVal;
}

function envBool(name: string, defaultVal: boolean): boolean {
  const raw = (process.env[name] || "").trim().toLowerCase();
  if (raw === "") return defaultVal;
  return ["1", "true", "yes", "on"].includes(raw);
}

export const config = {
  host: env("HOST", "0.0.0.0"),
  port: envInt("PORT", 3000),
  dbPath: path.resolve(env("SOLAR_DB_PATH", path.join(process.cwd(), "data", "samples.sqlite3"))),

  // RFC 5737 documentation range — set INVERTER_BASE in .env for a real device.
  inverterBase: env("INVERTER_BASE", "http://192.0.2.10").replace(/\/$/, ""),
  tcpEnable: envBool("INVERTER_TCP_ENABLE", false),
  tcpListenHost: env("INVERTER_TCP_LISTEN_HOST", "0.0.0.0"),
  tcpListenPort: envInt("INVERTER_TCP_LISTEN_PORT", 8899),
  stickHost: env("INVERTER_STICK_HOST", "").trim() || null,
  stickTcpPort: envInt("INVERTER_STICK_TCP_PORT", 8899),
  tcpSerial: envInt("INVERTER_TCP_SERIAL", 0),
  pollIntervalSec: envFloat("POLL_INTERVAL_SEC", 15),
  staleSec: envFloat("INVERTER_STALE_SEC", 120),
  httpUser: env("INVERTER_HTTP_USER", "").trim() || null,
  httpPassword: env("INVERTER_HTTP_PASSWORD", "").trim() || null,
  httpTimeoutSec: envFloat("INVERTER_HTTP_TIMEOUT_SEC", 15),
  inverterFetch: env("INVERTER_FETCH", "auto").toLowerCase(),
  httpCompareIntervalSec: envFloat("INVERTER_HTTP_COMPARE_INTERVAL_SEC", 0),
  compareDeltaW: envFloat("INVERTER_HTTP_COMPARE_DELTA_W", 150),
  parallelPullIntervalSec: envFloat("INVERTER_TEST_PULL_INTERVAL_SEC", 0),

  rawEventLogEnable: envBool("RAW_EVENT_LOG_ENABLE", false),
  rawEventMaxRows: envInt("RAW_EVENT_MAX_ROWS", 5000),

  backupIntervalSec: envInt("SQLITE_BACKUP_INTERVAL_SEC", 86400),
  backupDir: path.resolve(env("SQLITE_BACKUP_DIR", path.join(process.cwd(), "data", "backups"))),
  backupKeep: envInt("SQLITE_BACKUP_KEEP", 14),
  backupApiToken: env("BACKUP_API_TOKEN", "").trim() || null,
  adminApiToken: env("ADMIN_API_TOKEN", "").trim() || null,
};

export function stickHostResolved(): string {
  if (config.stickHost) return config.stickHost;
  try {
    const u = new URL(config.inverterBase.includes("://") ? config.inverterBase : `http://${config.inverterBase}`);
    return u.hostname;
  } catch {
    return config.inverterBase.replace(/^https?:\/\//, "").split("/")[0]!.split(":")[0]!;
  }
}

export function statusJsUrl(): string {
  return `${config.inverterBase}/js/status.js`;
}
