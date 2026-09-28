import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeSkyPhase } from "@/lib/sky-phase";

const setPhase = (p: string) => {
  document.documentElement.dataset.skyPhase = p;
};
// MutationObserver callbacks are async; let the queue flush.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("subscribeSkyPhase", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-sky-phase");
  });

  it("fires immediately with the current phase", async () => {
    setPhase("noon");
    const cb = vi.fn();
    const unsub = subscribeSkyPhase(cb);
    await flush();
    expect(cb).toHaveBeenCalledWith("noon");
    unsub();
  });

  it("notifies subscribers on phase change", async () => {
    setPhase("noon");
    const cb = vi.fn();
    const unsub = subscribeSkyPhase(cb);
    await flush();
    cb.mockClear();

    setPhase("night");
    await flush();

    expect(cb).toHaveBeenCalledWith("night");
    unsub();
  });

  it("ignores unknown phase values", async () => {
    setPhase("noon");
    const cb = vi.fn();
    const unsub = subscribeSkyPhase(cb);
    await flush();
    cb.mockClear();

    setPhase("not-a-phase");
    await flush();

    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it("stops notifying after unsubscribe", async () => {
    setPhase("noon");
    const cb = vi.fn();
    const unsub = subscribeSkyPhase(cb);
    await flush();
    cb.mockClear();
    unsub();

    setPhase("morning");
    await flush();

    expect(cb).not.toHaveBeenCalled();
  });

  it("fans one change out to multiple subscribers", async () => {
    setPhase("noon");
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = subscribeSkyPhase(a);
    const unsubB = subscribeSkyPhase(b);
    await flush();
    a.mockClear();
    b.mockClear();

    setPhase("morning");
    await flush();

    expect(a).toHaveBeenCalledWith("morning");
    expect(b).toHaveBeenCalledWith("morning");
    unsubA();
    unsubB();
  });
});
