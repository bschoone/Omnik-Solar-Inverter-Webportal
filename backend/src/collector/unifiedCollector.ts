import type Database from "better-sqlite3";
import { config, statusJsUrl, stickHostResolved } from "../config.js";
import { packInformationRequest, parseInformationReply } from "../omnik/binary.js";
import { parseStatusJs, snapshotToRow } from "../omnik/statusJs.js";
import { fetchStatusJs } from "../http/fetchStatusJs.js";
import { tcpPull } from "../tcp/pull.js";
import { insertSample, latestSample } from "../db/database.js";

export type UnifiedCollector = {
  stop: () => void;
  pollNow: () => Promise<{ ok: boolean; sample?: Record<string, unknown> | null; error?: string }>;
};

export function startUnifiedCollector(db: Database.Database, log: (msg: string) => void): UnifiedCollector {
  let lock: Promise<void> = Promise.resolve();
  const withLock = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = lock.then(fn);
    lock = run.then(
      () => {},
      () => {},
    );
    return run;
  };
  let lastHttpCompare = 0;
  let lastParallelPull = 0;
  let stopped = false;

  const sampleAgeSec = (): number | null => {
    const row = latestSample(db);
    if (!row) return null;
    return Date.now() / 1000 - row.ts;
  };

  const tcpPullOnce = async (): Promise<boolean> => {
    const host = stickHostResolved();
    const payload = packInformationRequest(config.tcpSerial);
    try {
      const data = await tcpPull(host, config.stickTcpPort, payload);
      if (!data.length) {
        log("tcp pull: empty response");
        return false;
      }
      const row = parseInformationReply(data);
      if (!row) {
        log("tcp pull: unparseable reply");
        return false;
      }
      insertSample(db, { ...row, data_source: "tcp_pull" }, true);
      log(`tcp pull OK power_w=${row.power_w}`);
      return true;
    } catch (e) {
      log(`tcp pull failed: ${String(e)}`);
      return false;
    }
  };

  const httpFetchAndStore = async (source: string): Promise<{ ok: boolean; error?: string }> => {
    const url = statusJsUrl();
    try {
      const text = await fetchStatusJs(
        url,
        config.httpTimeoutSec,
        config.httpUser || config.httpPassword
          ? { user: config.httpUser, password: config.httpPassword }
          : null,
        config.inverterFetch,
      );
      const snap = parseStatusJs(text);
      if (!snap) {
        return { ok: false, error: "could not parse webData from js/status.js" };
      }
      const row = snapshotToRow(snap);
      insertSample(db, { ...row, data_source: source }, true);
      log(`http ${source} OK power_w=${row.power_w}`);
      return { ok: true };
    } catch (e) {
      const msg = String(e);
      log(`http ${source} failed: ${msg}`);
      return { ok: false, error: msg };
    }
  };

  const httpCompareOnly = async () => {
    const latest = latestSample(db);
    if (!latest) return;
    const src = latest.data_source || "";
    if (!src.startsWith("tcp")) return;
    const tcpPower = latest.power_w;
    if (tcpPower === null) return;
    try {
      const text = await fetchStatusJs(
        statusJsUrl(),
        config.httpTimeoutSec,
        config.httpUser || config.httpPassword
          ? { user: config.httpUser, password: config.httpPassword }
          : null,
        config.inverterFetch,
      );
      const snap = parseStatusJs(text);
      if (!snap || snap.power_w === null) return;
      const diff = Math.abs(Number(tcpPower) - snap.power_w);
      if (diff > config.compareDeltaW) {
        log(`HTTP audit: power drift tcp=${tcpPower} W vs http=${snap.power_w} W (Δ=${diff.toFixed(0)} W)`);
      }
    } catch {
      /* skip */
    }
  };

  const watchdogTick = async () => {
    if (stopped) return;
    const now = Date.now() / 1000;
    const age = sampleAgeSec();

    if (config.httpCompareIntervalSec > 0 && age !== null && age < config.staleSec) {
      if (now - lastHttpCompare >= config.httpCompareIntervalSec) {
        await withLock(async () => {
          await httpCompareOnly();
        });
        lastHttpCompare = now;
      }
    }

    if (config.parallelPullIntervalSec > 0) {
      if (now - lastParallelPull >= config.parallelPullIntervalSec) {
        await withLock(async () => {
          await tcpPullOnce();
        });
        lastParallelPull = now;
      }
    }

    if (age !== null && age < config.staleSec) return;

    await withLock(async () => {
      if (await tcpPullOnce()) return;
      await httpFetchAndStore("http_fallback");
    });
  };

  const interval = setInterval(() => {
    watchdogTick().catch((e) => log(`watchdog error: ${String(e)}`));
  }, config.pollIntervalSec * 1000);
  setImmediate(() => {
    watchdogTick().catch((e) => log(`watchdog error: ${String(e)}`));
  });

  const pollNow = async () => {
    return withLock(async () => {
      if (await tcpPullOnce()) {
        return { ok: true, sample: latestSample(db) as Record<string, unknown> | null };
      }
      const r = await httpFetchAndStore("http_fallback");
      if (!r.ok) return { ok: false, error: r.error || "poll failed" };
      return { ok: true, sample: latestSample(db) as Record<string, unknown> | null };
    });
  };

  return {
    stop: () => {
      stopped = true;
      clearInterval(interval);
    },
    pollNow,
  };
}
