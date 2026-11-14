import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BIRDS,
  birdHistory,
  birdLab,
  birdValue,
  setBirdValue,
} from "@/lib/birds/lab.svelte";
import { defaultBirdSettings } from "@/lib/birds/settings";
import { loadSkyText, skyParts, skyText } from "../src/routes/sky-panel.svelte";

describe("bird lab", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    birdLab.settings = defaultBirdSettings();
    birdHistory.load();
  });

  it("sets a value by its path and undoes it", () => {
    const path = ["scenarios", "noon", "tune", "skein", "speed"];
    const was = birdValue(birdLab.settings, path) as number;
    setBirdValue(path, "Speed", was + 0.5);
    expect(birdValue(birdLab.settings, path)).toBe(was + 0.5);
    expect(birdHistory.of(BIRDS).changes.map((c) => c.label)).toEqual([
      "Speed",
    ]);
    birdHistory.undo(BIRDS);
    expect(birdValue(birdLab.settings, path)).toBe(was);
    birdHistory.redo(BIRDS);
    expect(birdValue(birdLab.settings, path)).toBe(was + 0.5);
  });

  it("a change taken straight back leaves no entry", () => {
    const was = birdLab.settings.scale;
    setBirdValue(["scale"], "Size", was * 2);
    expect(birdHistory.of(BIRDS).changes).toHaveLength(1);
    // The same control, moved home again before the merge window closes.
    setBirdValue(["scale"], "Size", was);
    expect(birdHistory.of(BIRDS).changes).toHaveLength(0);
    expect(birdHistory.of(BIRDS).at).toBe(-1);

    // A change that stays, then another taken back, keeps the first.
    setBirdValue(["twoTwists"], "Two twists", birdLab.settings.twoTwists + 0.1);
    setBirdValue(["scale"], "Size", was * 2);
    setBirdValue(["scale"], "Size", was);
    expect(birdHistory.of(BIRDS).changes.map((c) => c.label)).toEqual([
      "Two twists",
    ]);
  });

  it("keeps the history only while the settings still stand where it says", () => {
    setBirdValue(["scale"], "Size", birdLab.settings.scale * 2);
    birdHistory.load();
    expect(birdHistory.of(BIRDS).changes.length).toBe(1);
    birdLab.settings = defaultBirdSettings();
    birdHistory.load();
    expect(birdHistory.of(BIRDS).changes.length).toBe(0);
  });
});

describe("saved sky text", () => {
  it("carries both halves, and reads back the ones it holds", () => {
    const loaded: Record<string, unknown> = {};
    skyParts.clouds = {
      data: () => ({ clouds: [{ id: 0 }] }),
      load: (d) => {
        loaded.clouds = d;
      },
    };
    skyParts.birds = {
      data: () => ({ scale: 2 }),
      load: (d) => {
        loaded.birds = d;
      },
    };
    const text = skyText();
    loadSkyText(text);
    expect(loaded.clouds).toEqual({ clouds: [{ id: 0 }] });
    expect(loaded.birds).toEqual({ scale: 2 });

    // Text from before the birds were saved holds the clouds alone.
    delete loaded.birds;
    loadSkyText(JSON.stringify({ clouds: [{ id: 1 }] }));
    expect(loaded.clouds).toEqual({ clouds: [{ id: 1 }] });
    expect(loaded.birds).toBeUndefined();

    expect(() => loadSkyText("{}")).toThrow();
    delete skyParts.clouds;
    delete skyParts.birds;
  });
});
