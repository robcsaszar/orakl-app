/// <reference lib="webworker" />
import type { ToWorker } from "./driver";
import { WorkerHost } from "./worker-host";

/**
 * The sky's worker entry: simulation and drawing run here on an
 * OffscreenCanvas, so the page's frame budget never sees a bird.
 */
const host = new WorkerHost((m) => self.postMessage(m));
self.onmessage = (e: MessageEvent<ToWorker>) => host.handle(e.data);
