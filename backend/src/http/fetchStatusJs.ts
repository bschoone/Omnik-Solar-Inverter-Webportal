import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";

const execFileAsync = promisify(execFile);

function whichCurl(): string | null {
  const paths = ["/usr/bin/curl", "/usr/local/bin/curl"];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function fetchCurl(url: string, timeoutSec: number, user: string | null, password: string | null): Promise<string> {
  const curl = whichCurl() || "curl";
  const args = ["-fsS", "-L", "--max-time", String(Math.max(1, Math.floor(timeoutSec))), "-A", "solar-backend/1"];
  if (user !== null || password !== null) {
    args.push("-u", `${user || ""}:${password || ""}`);
  }
  args.push(url);
  const { stdout } = await execFileAsync(curl, args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: (timeoutSec + 3) * 1000,
    encoding: "utf8",
  });
  return stdout as string;
}

export async function fetchStatusJs(
  url: string,
  timeoutSec: number,
  auth: { user: string | null; password: string | null } | null,
  mode: string,
): Promise<string> {
  const user = auth?.user ?? null;
  const password = auth?.password ?? null;
  const m = mode.toLowerCase();
  if (m === "curl") {
    return fetchCurl(url, timeoutSec, user, password);
  }
  if (m === "urllib" || m === "fetch") {
    return fetchNative(url, timeoutSec, user, password);
  }
  // auto: prefer curl on darwin if available
  if (m === "auto" && process.platform === "darwin" && whichCurl()) {
    try {
      return await fetchCurl(url, timeoutSec, user, password);
    } catch {
      return fetchNative(url, timeoutSec, user, password);
    }
  }
  try {
    return await fetchNative(url, timeoutSec, user, password);
  } catch {
    if (whichCurl()) {
      return fetchCurl(url, timeoutSec, user, password);
    }
    throw new Error("fetch failed and curl not available");
  }
}

async function fetchNative(url: string, timeoutSec: number, user: string | null, password: string | null): Promise<string> {
  const headers: Record<string, string> = { "User-Agent": "solar-backend/1" };
  if (user !== null || password !== null) {
    const token = Buffer.from(`${user || ""}:${password || ""}`, "utf8").toString("base64");
    headers["Authorization"] = `Basic ${token}`;
  }
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), (timeoutSec + 2) * 1000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString("utf8");
  } finally {
    clearTimeout(to);
  }
}
