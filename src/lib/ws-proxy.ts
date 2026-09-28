import {
  type ClientRequest,
  request as httpRequest,
  type IncomingMessage,
} from "node:http";
import { request as httpsRequest } from "node:https";
import type { Duplex } from "node:stream";

/** How long the upstream may take to answer the handshake before the client
 *  gets a 502 and both sides are released. */
export const UPSTREAM_HANDSHAKE_TIMEOUT_MS = 10_000;

/**
 * Hand one WebSocket upgrade to an upstream server and splice the two sockets
 * together. The upstream's handshake response is written to the client byte
 * for byte, so a `Set-Cookie` on the 101 reaches the browser; a non-101 answer
 * (401, a `fly-replay` 200) is relayed and the client socket closed. The
 * upstream sees the public host in `x-forwarded-host` and the client address
 * in `x-forwarded-for`. Every failure — unreachable upstream, handshake
 * timeout, client gone before the handshake — releases both sockets.
 */
export function proxyUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  target: URL,
): void {
  const url = new URL(req.url ?? "/", target);
  const headers: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined && name !== "transfer-encoding") {
      headers[name] = value;
    }
  }
  headers.host = url.host;
  headers["x-forwarded-host"] = req.headers.host ?? url.host;
  headers["x-forwarded-proto"] = "https";
  const remote = req.socket?.remoteAddress;
  if (remote) headers["x-forwarded-for"] = remote;

  let settled = false;
  const fail = (upstream?: ClientRequest) => {
    if (settled) return;
    settled = true;
    upstream?.destroy();
    if (socket.writable) {
      socket.write(
        "HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
      );
    }
    socket.destroy();
  };

  let upstream: ClientRequest;
  try {
    const request = url.protocol === "https:" ? httpsRequest : httpRequest;
    upstream = request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "GET",
      headers,
    });
  } catch {
    fail();
    return;
  }

  upstream.setTimeout(UPSTREAM_HANDSHAKE_TIMEOUT_MS, () => fail(upstream));
  upstream.on("error", () => fail(upstream));
  // A client that gives up before the handshake takes the upstream with it.
  // The socket has to be read for its FIN to be noticed, so anything the
  // client sends early is held and replayed to the upstream after the 101.
  const early: Buffer[] = [];
  const onEarlyData = (chunk: Buffer) => {
    early.push(chunk);
  };
  const onClientGone = () => fail(upstream);
  socket.on("data", onEarlyData);
  socket.on("end", onClientGone);
  socket.on("close", onClientGone);
  socket.on("error", onClientGone);

  upstream.on("upgrade", (res, upstreamSocket, upstreamHead) => {
    settled = true;
    upstream.setTimeout(0);
    socket.off("data", onEarlyData);
    socket.off("end", onClientGone);
    socket.off("close", onClientGone);
    socket.off("error", onClientGone);
    socket.write(statusAndHeaders(res, res.rawHeaders));
    if (upstreamHead.length) socket.write(upstreamHead);
    const pending = Buffer.concat([head, ...early]);
    if (pending.length) upstreamSocket.write(pending);
    upstreamSocket.on("error", () => socket.destroy());
    upstreamSocket.on("close", () => socket.destroy());
    socket.on("error", () => upstreamSocket.destroy());
    socket.on("close", () => upstreamSocket.destroy());
    upstreamSocket.pipe(socket).pipe(upstreamSocket);
  });

  upstream.on("response", (res) => {
    settled = true;
    upstream.setTimeout(0);
    const chunks: Buffer[] = [];
    res.on("data", (c: Buffer) => chunks.push(c));
    res.on("end", () => {
      const body = Buffer.concat(chunks);
      const rawHeaders = res.rawHeaders.filter(
        (_, i, all) =>
          !["transfer-encoding", "content-length"].includes(
            all[i - (i % 2)].toLowerCase(),
          ),
      );
      rawHeaders.push("Content-Length", String(body.byteLength));
      if (socket.writable) {
        socket.write(statusAndHeaders(res, rawHeaders));
        socket.write(body);
      }
      socket.end();
    });
    res.on("error", () => socket.destroy());
  });

  upstream.end();
}

function statusAndHeaders(res: IncomingMessage, rawHeaders: string[]): string {
  const lines = [
    `HTTP/1.1 ${res.statusCode ?? 502} ${res.statusMessage ?? ""}`,
  ];
  for (let i = 0; i < rawHeaders.length; i += 2) {
    lines.push(`${rawHeaders[i]}: ${rawHeaders[i + 1]}`);
  }
  return `${lines.join("\r\n")}\r\n\r\n`;
}
