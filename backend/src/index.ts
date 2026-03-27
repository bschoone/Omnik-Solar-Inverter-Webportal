import http from "node:http";
import { config } from "./config.js";
import { openDatabase } from "./db/database.js";
import { startBackupScheduler } from "./db/backup.js";
import { startTcpPushServer } from "./tcp/pushServer.js";
import { startUnifiedCollector } from "./collector/unifiedCollector.js";
import { startSimpleHttpPoller } from "./collector/simpleHttpPoller.js";
import { createApp } from "./createApp.js";

const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);

const db = openDatabase(config.dbPath);

let collector: ReturnType<typeof startUnifiedCollector> | null = null;
let tcpServer: ReturnType<typeof startTcpPushServer> | null = null;
let stopBackup: (() => void) | null = null;

if (config.tcpEnable) {
  collector = startUnifiedCollector(db, log);
  tcpServer = startTcpPushServer({
    db,
    host: config.tcpListenHost,
    port: config.tcpListenPort,
    idleTimeoutMs: Math.max(5000, config.staleSec * 1000),
    log,
  });
} else {
  log("INVERTER_TCP_ENABLE off — HTTP-only poller (Python Poller equivalent)");
  collector = startSimpleHttpPoller(db, log);
}

const app = createApp(db, collector);

const server = http.createServer(app);
server.listen(config.port, config.host, () => {
  log(`HTTP listening on http://${config.host}:${config.port}`);
});

stopBackup = startBackupScheduler(db, config.backupIntervalSec, config.backupDir, config.backupKeep, log);

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  log("shutting down...");
  stopBackup?.();
  collector?.stop();
  tcpServer?.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
