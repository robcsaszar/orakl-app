import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLOUD_SETTINGS } from "@/lib/sky-clouds";
import {
  ALL_CLOUDS,
  clearCloudHistory,
  cloudEdit,
  cloudHistory,
  cloudLab,
  cloudSnapshot,
  goToCloudChange,
  loadCloudHistory,
  logCloudChange,
  redoCloud,
  undoCloud,
} from "@/lib/sky-clouds-lab.svelte";

/** Makes one change to a cloud and logs it. */
function change(id: number, label: string, apply: () => void) {
  const before = cloudSnapshot(id);
  apply();
  logCloudChange(id, label, before);
}

describe("cloud history", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    // A pool with nothing of its own, so each test sets what it reads.
    cloudLab.settings = {
      ...structuredClone(CLOUD_SETTINGS),
      model: {},
      edits: {},
      removed: [],
    };
    loadCloudHistory();
  });

  it("logs a change and steps back and forward through it", () => {
    change(1, "Changed width", () => (cloudEdit(1).width = 70));
    expect(cloudHistory(1)).toMatchObject({ at: 0 });
    undoCloud(1);
    expect(cloudLab.settings.edits[1]).toBeUndefined();
    redoCloud(1);
    expect(cloudLab.settings.edits[1]?.width).toBe(70);
  });

  it("logs nothing when nothing changed", () => {
    change(1, "Changed width", () => {});
    expect(cloudHistory(1).changes).toHaveLength(0);
  });

  it("counts a slider dragged as one change, and a later one as another", () => {
    change(1, "Changed width", () => (cloudEdit(1).width = 50));
    change(1, "Changed width", () => (cloudEdit(1).width = 60));
    expect(cloudHistory(1).changes).toHaveLength(1);
    vi.advanceTimersByTime(60_000);
    change(1, "Changed width", () => (cloudEdit(1).width = 70));
    expect(cloudHistory(1).changes).toHaveLength(2);
  });

  it("goes to any change, or to before them all", () => {
    change(1, "Changed width", () => (cloudEdit(1).width = 50));
    change(1, "Changed height", () => (cloudEdit(1).height = 2));
    goToCloudChange(1, 0);
    expect(cloudLab.settings.edits[1]).toEqual({ width: 50 });
    goToCloudChange(1, -1);
    expect(cloudLab.settings.edits[1]).toBeUndefined();
  });

  it("drops the changes that were undone past when a new one is made", () => {
    change(1, "Changed width", () => (cloudEdit(1).width = 50));
    change(1, "Changed height", () => (cloudEdit(1).height = 2));
    undoCloud(1);
    change(1, "Renamed the cloud", () => (cloudEdit(1).name = "anvil"));
    expect(cloudHistory(1).changes.map((c) => c.label)).toEqual([
      "Changed width",
      "Renamed the cloud",
    ]);
  });

  it("keeps each cloud's history apart from the shared settings'", () => {
    change(
      ALL_CLOUDS,
      "Changed big lumps",
      () => (cloudLab.settings.model = { body: 8 }),
    );
    change(1, "Changed width", () => (cloudEdit(1).width = 50));
    undoCloud(ALL_CLOUDS);
    expect(cloudLab.settings.model).toEqual({});
    expect(cloudLab.settings.edits[1]?.width).toBe(50);
  });

  it("is still there after a reload, and not when the cloud has moved on without it", () => {
    change(1, "Changed width", () => (cloudEdit(1).width = 50));
    loadCloudHistory();
    expect(cloudHistory(1).changes).toHaveLength(1);
    cloudEdit(1).width = 99;
    loadCloudHistory();
    expect(cloudHistory(1).changes).toHaveLength(0);
  });

  it("forgets a history and leaves the cloud as it is", () => {
    change(1, "Changed width", () => (cloudEdit(1).width = 50));
    clearCloudHistory(1);
    expect(cloudHistory(1).changes).toHaveLength(0);
    expect(cloudLab.settings.edits[1]?.width).toBe(50);
  });
});
