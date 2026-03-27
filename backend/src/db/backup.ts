import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function listBackupFiles(backupDir: string): string[] {
  if (!fs.existsSync(backupDir)) return [];
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".sqlite3") && f.startsWith("samples-"))
    .map((f) => path.join(backupDir, f));
  files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
  return files;
}

function pruneOldBackups(backupDir: string, keep: number) {
  for (;;) {
    const files = listBackupFiles(backupDir);
    if (files.length <= keep) break;
    const oldest = files[0];
    if (!oldest) break;
    try {
      fs.unlinkSync(oldest);
    } catch {
      break;
    }
  }
}

/** online backup via better-sqlite3 async backup API */
export async function backupDatabase(db: Database.Database, backupDir: string, keep: number): Promise<string> {
  ensureDir(backupDir);
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const dest = path.join(backupDir, `samples-${stamp}.sqlite3`);
  await db.backup(dest);
  pruneOldBackups(backupDir, keep);
  return dest;
}

export function startBackupScheduler(
  db: Database.Database,
  intervalSec: number,
  backupDir: string,
  keep: number,
  log: (msg: string) => void,
): () => void {
  if (intervalSec <= 0) return () => {};

  const tick = () => {
    backupDatabase(db, backupDir, keep)
      .then((p) => log(`sqlite backup: ${p}`))
      .catch((e: unknown) => log(`sqlite backup failed: ${String(e)}`));
  };

  const id = setInterval(tick, intervalSec * 1000);
  return () => clearInterval(id);
}
