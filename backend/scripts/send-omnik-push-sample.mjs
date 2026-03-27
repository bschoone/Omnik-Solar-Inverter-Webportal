#!/usr/bin/env node
/**
 * Send one Omnik-style push burst to the TCP listener (same framing as the real stick).
 * Use this to test ingestion without the inverter (backend must have INVERTER_TCP_ENABLE=1).
 *
 *   node scripts/send-omnik-push-sample.mjs
 *   node scripts/send-omnik-push-sample.mjs 127.0.0.1 8899
 *   node scripts/send-omnik-push-sample.mjs 192.0.2.10 8899 --file ./my-capture.hex
 *
 * --file: hex text (optional whitespace / line breaks). If omitted, a built-in sample is used.
 */

import fs from "node:fs";
import net from "node:net";
import path from "node:path";

/** Real capture: 183 B telemetry …c3 16 + 31 B “DATA SEND IS OK” … 16 (214 B). */
const BUILTIN_HEX = [
  "68a941b0e923a85fe923a85f8102014155454e33303230313442453130303200",
  "f20cbe00000000000500010000000700",
  "00000000094a00000000138a00830000",
  "000000000000004c0741100000000000",
  "01000000000000000000000000000000",
  "00000000010000000000000000000000",
  "00000000000000000000000000000000",
  "00000000000000000000000000000000",
  "00000000000000000000000000000000",
  "00000000000000000000000000000000",
  "0000000000c316",
  "681141f0e923a85fe923a85f444154412053454e44204953204f4b0d0a5916",
].join("");

function parseArgs(argv) {
  let host = "127.0.0.1";
  let port = 8899;
  let file = null;
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file" || a === "-f") {
      file = argv[++i];
      if (!file) {
        console.error("missing path after --file");
        process.exit(1);
      }
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
    positional.push(a);
  }
  if (positional[0]) host = positional[0];
  if (positional[1]) port = Number(positional[1]);
  return { host, port, file };
}

function loadPayload(file) {
  if (!file) {
    if (BUILTIN_HEX.length % 2 !== 0) throw new Error("builtin hex length");
    return Buffer.from(BUILTIN_HEX, "hex");
  }
  const p = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const text = fs.readFileSync(p, "utf8").replace(/\s+/g, "");
  if (!/^[0-9a-fA-F]+$/.test(text)) throw new Error("file must be hex digits (optional whitespace)");
  if (text.length % 2 !== 0) throw new Error("hex length must be even");
  return Buffer.from(text, "hex");
}

const { host, port, file } = parseArgs(process.argv.slice(2));
const payload = loadPayload(file);

const socket = net.connect({ host, port }, () => {
  console.error(`connected ${host}:${port}, sending ${payload.length} bytes…`);
  socket.write(payload, () => {
    socket.end();
  });
});

socket.setTimeout(10_000);
socket.on("timeout", () => {
  socket.destroy();
  console.error("timeout");
  process.exit(1);
});
socket.on("error", (e) => {
  console.error(String(e));
  process.exit(1);
});
socket.on("close", () => {
  console.error("done (FIN sent — check backend logs / GET /api/current)");
  process.exit(0);
});
