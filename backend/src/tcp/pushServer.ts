import net from "node:net";
import type Database from "better-sqlite3";
import { MESSAGE_END, parseInformationReply } from "../omnik/binary.js";
import { insertRawEvent, insertSample, pruneRawEvents } from "../db/database.js";
import { config } from "../config.js";

type PushOpts = {
  db: Database.Database;
  port: number;
  host: string;
  idleTimeoutMs: number;
  log: (msg: string) => void;
};

export function startTcpPushServer(opts: PushOpts): net.Server {
  const server = net.createServer((socket) => {
    const peer = `${socket.remoteAddress || "?"}:${socket.remotePort || "?"}`;
    opts.log(`tcp push connect ${peer}`);
    let buf = Buffer.alloc(0);
    socket.setTimeout(opts.idleTimeoutMs);

    socket.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        const idx = buf.indexOf(MESSAGE_END);
        if (idx < 0) break;
        const frame = buf.subarray(0, idx + 1);
        buf = buf.subarray(idx + 1);
        const row = parseInformationReply(frame);
        if (config.rawEventLogEnable) {
          insertRawEvent(opts.db, {
            dataSource: "tcp_push",
            peerIp: socket.remoteAddress ?? null,
            payload: frame,
            parseError: row ? undefined : "parse_information_reply returned null",
          });
          pruneRawEvents(opts.db, config.rawEventMaxRows);
        }
        if (row) {
          insertSample(opts.db, { ...row, data_source: "tcp_push" }, true);
        }
      }
    });

    socket.on("timeout", () => {
      try {
        socket.end();
      } catch {
        socket.destroy();
      }
    });

    socket.on("error", () => {
      /* ignore */
    });

    socket.on("close", () => {
      opts.log(`tcp push disconnect ${peer}`);
    });
  });

  server.on("error", (e) => opts.log(`tcp push server error: ${String(e)}`));
  server.listen(opts.port, opts.host, () => {
    opts.log(`TCP push listening on ${opts.host}:${opts.port}`);
  });
  return server;
}
