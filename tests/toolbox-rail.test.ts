import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../src/lib/svelte/mockQuizSession.svelte.js";

vi.mock("../src/lib/storage.js", () => ({
  getStorageItem: vi.fn(() => null),
  setStorageItem: vi.fn(),
}));

const storage = await import("../src/lib/storage.js");

async function loadRail() {
  vi.resetModules();
  return import("../src/routes/(game)/quiz/toolbox-rail.svelte.js");
}

describe("toolboxRail", () => {
  beforeEach(() => {
    vi.mocked(storage.getStorageItem).mockReset().mockReturnValue(null);
    vi.mocked(storage.setStorageItem).mockReset();
  });

  it("register sets the session; cleanup clears it", async () => {
    const { registerToolboxRail, toolboxRail } = await loadRail();
    const session = new MockQuizSession();
    const cleanup = registerToolboxRail(session);
    expect(toolboxRail.session).toBe(session);
    cleanup();
    expect(toolboxRail.session).toBeNull();
  });

  it("cleanup does not clear a later registration", async () => {
    const { registerToolboxRail, toolboxRail } = await loadRail();
    const first = new MockQuizSession();
    const second = new MockQuizSession();
    const cleanupFirst = registerToolboxRail(first);
    registerToolboxRail(second);
    cleanupFirst();
    expect(toolboxRail.session).toBe(second);
  });

  it("collapsed defaults to false; toggle flips it", async () => {
    const { toggleToolboxRail, toolboxRail } = await loadRail();
    expect(toolboxRail.collapsed).toBe(false);
    toggleToolboxRail();
    expect(toolboxRail.collapsed).toBe(true);
    toggleToolboxRail();
    expect(toolboxRail.collapsed).toBe(false);
  });

  it("register does not reset collapsed", async () => {
    const { registerToolboxRail, toggleToolboxRail, toolboxRail } =
      await loadRail();
    toggleToolboxRail();
    registerToolboxRail(new MockQuizSession());
    expect(toolboxRail.collapsed).toBe(true);
  });

  it("toggle persists through the storage seam and reads back on load", async () => {
    const { toggleToolboxRail } = await loadRail();
    toggleToolboxRail();
    expect(storage.setStorageItem).toHaveBeenCalledWith(
      "orakl-toolbox-rail",
      "collapsed",
    );
    vi.mocked(storage.getStorageItem).mockReturnValue("collapsed");
    const { toolboxRail } = await loadRail();
    expect(storage.getStorageItem).toHaveBeenCalledWith("orakl-toolbox-rail");
    expect(toolboxRail.collapsed).toBe(true);
  });

  it("a throwing storage leaves the default", async () => {
    vi.mocked(storage.getStorageItem).mockImplementation(() => {
      throw new Error("blocked");
    });
    const { toolboxRail } = await loadRail();
    expect(toolboxRail.collapsed).toBe(false);
  });
});

describe("pendingCount", () => {
  it("returns 0 for null", async () => {
    const { pendingCount } = await loadRail();
    expect(pendingCount(null)).toBe(0);
  });

  it("returns the count of pending players only", async () => {
    const { pendingCount } = await loadRail();
    const session = new MockQuizSession();
    session.players = [
      { id: "1", nickname: "A", avatar: "", score: 0, status: "pending" },
      { id: "2", nickname: "B", avatar: "", score: 0, status: "active" },
      { id: "3", nickname: "C", avatar: "", score: 0, status: "pending" },
    ];
    expect(pendingCount(session)).toBe(2);
  });
});
