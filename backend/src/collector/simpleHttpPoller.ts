import type Database from "better-sqlite3";
import { config, statusJsUrl } from "../config.js";
import { parseStatusJs, snapshotToRow } from "../omnik/statusJs.js";
import { fetchStatusJs } from "../http/fetchStatusJs.js";
import { insertSample, latestSample } from "../db/database.js";
import type { UnifiedCollector } from "./unifiedCollector.js";

async function httpFetchOnce(db: Database.Database, source: string, log: (m: string) => void) {
  const url = statusJsUrl();
  const text = await fetchStatusJs(
    url,
    config.httpTimeoutSec,
    config.httpUser || config.httpPassword ? { user: config.httpUser, password: config.httpPassword } : null,
    config.inverterFetch,
  );
  const snap = parseStatusJs(text);
  if (!snap) throw new Error("could not parse webData");
  const row = snapshotToRow(snap);
  insertSample(db, { ...row, data_source: source }, true);
  log(`http ${source} OK power_w=${row.power_w}`);
}

/** HTTP-only background poller (Python Poller equivalent when INVERTER_TCP_ENABLE=0). */
export function startSimpleHttpPoller(db: Database.Database, log: (msg: string) => void): UnifiedCollector {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      await httpFetchOnce(db, "http_poll", log);
    } catch (e) {
      log(`http poll failed: ${String(e)}`);
    }
  };

  const interval = setInterval(() => {
    tick();
  }, config.pollIntervalSec * 1000);
  setImmediate(() => {
    tick();
  });

  return {
    stop: () => {
      stopped = true;
      clearInterval(interval);
    },
    pollNow: async () => {
      try {
        await httpFetchOnce(db, "http_poll", log);
        return { ok: true as const, sample: latestSample(db) as Record<string, unknown> | null };
      } catch (e) {
        return { ok: false as const, error: String(e) };
      }
    },
  };
}
