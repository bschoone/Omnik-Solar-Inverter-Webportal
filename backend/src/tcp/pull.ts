import net from "node:net";

/** TCP pull: connect, send payload, half-close write, read until idle/cap — mirrors Python unified_poller. */
export function tcpPull(host: string, port: number, payload: Buffer, deadlineMs = 18000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port, family: 4 });

    const chunks: Buffer[] = [];
    let total = 0;
    const maxBytes = 16384;
    const deadline = Date.now() + deadlineMs;

    const finish = () => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(Buffer.concat(chunks));
    };

    socket.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      total += chunk.length;
      if (total >= maxBytes) finish();
    });

    socket.on("timeout", () => finish());

    socket.on("end", () => finish());

    socket.on("error", (e) => {
      socket.removeAllListeners();
      reject(e);
    });

    socket.on("connect", () => {
      socket.write(payload, (err) => {
        if (err) {
          socket.destroy();
          reject(err);
          return;
        }
        try {
          socket.end();
        } catch {
          /* ignore */
        }
        socket.setTimeout(Math.min(4000, Math.max(50, deadline - Date.now())));
      });
    });
  });
}
