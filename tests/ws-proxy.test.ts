// @vitest-environment node
import { createServer, type Server } from "node:http";
import net, { type AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import {
  proxyUpgrade,
  UPSTREAM_HANDSHAKE_TIMEOUT_MS,
} from "../src/lib/ws-proxy.js";

/** An upstream that behaves like the API's socket server: echoes frames,
 *  reports what the upgrade carried, sets a cookie on the 101, and refuses
 *  a `reject` path with a bare 401. */
function startUpstream(): Promise<{ server: Server; origin: string }> {
  const server = createServer();
  const wss = new WebSocketServer({ noServer: true });
  wss.on("headers", (headers) => {
    headers.push("Set-Cookie: game_token=refreshed; Path=/; HttpOnly");
  });
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/stall")) {
      // Never answers the handshake; an upgraded socket's owner must close it
      // on the peer's FIN, as a real socket server does.
      socket.resume();
      socket.on("end", () => socket.destroy());
      return;
    }
    if (req.url?.startsWith("/chunked")) {
      socket.write(
        [
          "HTTP/1.1 403 Forbidden",
          "Transfer-Encoding: chunked",
          "Connection: close",
          "",
          "5",
          "hello",
          "0",
          "",
          "",
        ].join("\r\n"),
      );
      socket.end();
      return;
    }
    if (req.url?.startsWith("/reject")) {
      socket.write(
        "HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
      );
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.send(
        JSON.stringify({
          cookie: req.headers.cookie ?? null,
          forwardedHost: req.headers["x-forwarded-host"] ?? null,
          forwardedFor: req.headers["x-forwarded-for"] ?? null,
          host: req.headers.host,
          url: req.url,
        }),
      );
      ws.on("message", (data) => ws.send(`echo:${data.toString()}`));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

function startEdge(target: URL): Promise<{ server: Server; port: number }> {
  const server = createServer();
  server.on("upgrade", (req, socket, head) =>
    proxyUpgrade(req, socket, head, target),
  );
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: (server.address() as AddressInfo).port });
    });
  });
}

function connect(url: string, headers: Record<string, string>) {
  const ws = new WebSocket(url, { headers });
  const handshake = new Promise<{ status: number; setCookie: string[] }>(
    (resolve) => {
      ws.on("upgrade", (res) =>
        resolve({
          status: res.statusCode ?? 0,
          setCookie: res.headers["set-cookie"] ?? [],
        }),
      );
    },
  );
  const messages: string[] = [];
  const nextMessage = () =>
    new Promise<string>((resolve) =>
      ws.once("message", (d) => {
        messages.push(d.toString());
        resolve(d.toString());
      }),
    );
  return { ws, handshake, nextMessage, messages };
}

describe("proxyUpgrade", () => {
  let upstream: { server: Server; origin: string };
  let edge: { server: Server; port: number };

  beforeAll(async () => {
    upstream = await startUpstream();
    edge = await startEdge(new URL(upstream.origin));
  });

  afterAll(async () => {
    await new Promise((r) => edge.server.close(r));
    await new Promise((r) => upstream.server.close(r));
  });

  it("splices the socket, relays the cookie both ways, and names the public host", async () => {
    const c = connect(`ws://127.0.0.1:${edge.port}/api/solo/ws?x=1`, {
      cookie: "game_token=abc",
      host: "orakl.quest",
    });
    const first = c.nextMessage();
    const hs = await c.handshake;
    expect(hs.status).toBe(101);
    expect(hs.setCookie.join(";")).toContain("game_token=refreshed");

    const seen = JSON.parse(await first);
    expect(seen.cookie).toBe("game_token=abc");
    expect(seen.forwardedHost).toBe("orakl.quest");
    expect(seen.forwardedFor).toBe("127.0.0.1");
    expect(seen.url).toBe("/api/solo/ws?x=1");
    expect(seen.host).not.toBe("orakl.quest");

    const echo = c.nextMessage();
    c.ws.send("ping-frame");
    expect(await echo).toBe("echo:ping-frame");
    c.ws.close();
  });

  it("relays a non-101 answer from the upstream and closes", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${edge.port}/reject`);
    const result = await new Promise<{ status: number }>((resolve) => {
      ws.on("unexpected-response", (_req, res) =>
        resolve({ status: res.statusCode ?? 0 }),
      );
      ws.on("error", () => {});
    });
    expect(result.status).toBe(401);
  });

  it("re-frames a chunked non-101 answer with a Content-Length", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${edge.port}/chunked`);
    const got = await new Promise<{
      status: number;
      length: string | undefined;
      body: string;
    }>((resolve) => {
      ws.on("unexpected-response", (_req, res) => {
        let body = "";
        res.on("data", (d) => {
          body += d.toString();
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            length: res.headers["content-length"],
            body,
          }),
        );
      });
      ws.on("error", () => {});
    });
    expect(got.status).toBe(403);
    expect(got.length).toBe("5");
    expect(got.body).toBe("hello");
  });

  it("survives an upgrade with no Host header and still forwards it", async () => {
    const seen = await new Promise<{ status: number; body: string }>(
      (resolve) => {
        const s = net.connect(edge.port, "127.0.0.1", () => {
          s.write(
            [
              "GET /api/solo/ws HTTP/1.1",
              "Connection: Upgrade",
              "Upgrade: websocket",
              "Sec-WebSocket-Version: 13",
              "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
              "",
              "",
            ].join("\r\n"),
          );
        });
        let buf = "";
        s.on("data", (d) => {
          buf += d.toString();
          if (buf.includes("\r\n\r\n")) {
            resolve({ status: Number(buf.split(" ")[1]), body: buf });
            s.destroy();
          }
        });
      },
    );
    expect(seen.status).toBe(101);
  });

  it("releases both sides when the client leaves before the upstream answers", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${edge.port}/stall`);
    ws.on("error", () => {});
    await new Promise((r) => setTimeout(r, 150));
    ws.terminate();
    await new Promise((r) => setTimeout(r, 300));
    const edgeOpen = await new Promise<number>((r) =>
      edge.server.getConnections((_e, n) => r(n)),
    );
    const upOpen = await new Promise<number>((r) =>
      upstream.server.getConnections((_e, n) => r(n)),
    );
    expect(edgeOpen).toBe(0);
    expect(upOpen).toBe(0);
  });

  it("answers 502 and releases the upstream when the handshake times out", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      const ws = new WebSocket(`ws://127.0.0.1:${edge.port}/stall`);
      const status = new Promise<number>((resolve) => {
        ws.on("unexpected-response", (_req, res) =>
          resolve(res.statusCode ?? 0),
        );
        ws.on("error", () => resolve(-1));
      });
      await new Promise((r) => setImmediate(r));
      await vi.advanceTimersByTimeAsync(UPSTREAM_HANDSHAKE_TIMEOUT_MS + 1);
      vi.useRealTimers();
      expect(await status).toBe(502);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not crash on an https origin it cannot reach", async () => {
    const dead = await startEdge(new URL("https://127.0.0.1:9"));
    const ws = new WebSocket(`ws://127.0.0.1:${dead.port}/api/solo/ws`);
    const status = await new Promise<number>((resolve) => {
      ws.on("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0));
      ws.on("error", () => resolve(-1));
    });
    expect(status).toBe(502);
    await new Promise((r) => dead.server.close(r));
  });

  it("answers 502 when the upstream is unreachable", async () => {
    const dead = await startEdge(new URL("http://127.0.0.1:9"));
    const ws = new WebSocket(`ws://127.0.0.1:${dead.port}/api/solo/ws`);
    const status = await new Promise<number>((resolve) => {
      ws.on("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0));
      ws.on("error", () => resolve(-1));
    });
    expect(status).toBe(502);
    await new Promise((r) => dead.server.close(r));
  });
});
