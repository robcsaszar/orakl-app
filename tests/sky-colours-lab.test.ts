import { SKY_PHASES, SKY_SCHEDULE } from "@orakl/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLOUD_TINT, PHASE_STOPS } from "@/lib/constants/phase-stops.constants";
import {
  addSkyPhase,
  changeSky,
  defaultSkyColours,
  hexToHsl,
  hslToHex,
  loadSkyColours,
  SCENE_KINDS,
  SCENE_MAX,
  SKY,
  SKY_SCENES,
  type SkyLook,
  showSky,
  skyHistory,
  skyKeyAt,
  skyLab,
  skyLabel,
  skyStops,
  skyStrength,
  skySwatch,
  skyTint,
} from "@/lib/sky-colours-lab.svelte";
import { loadSkyText, skyParts, skyText } from "../src/routes/sky-panel.svelte";

const look = (key: string) => skyLab.colours.looks[key] as SkyLook;

describe("sky lab", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    skyLab.active = false;
    skyLab.showing = null;
    skyLab.colours = defaultSkyColours();
    skyHistory.load();
  });

  it("gives the code's look until the controls are open", () => {
    changeSky("Noon", (c) => {
      const l = c.looks.noon as SkyLook;
      l.stops.colors[0] = "#123456";
      l.tint[1] = "#654321";
      l.starOpacity = 0.5;
    });
    expect(skyStops("noon")).toBe(PHASE_STOPS.noon);
    expect(skyTint("noon")).toBe(CLOUD_TINT.noon);
    const stars = skyStrength("noon").stars;
    skyLab.active = true;
    expect(skyStops("noon").colors[0]).toBe("#123456");
    expect(skyTint("noon")[1]).toBe("#654321");
    expect(skyStrength("noon").stars).not.toBe(stars);
  });

  it("records a change and undoes it", () => {
    const was = look("dusk").stops.offsets[2];
    changeSky("Dusk, middle: place", (c) => {
      (c.looks.dusk as SkyLook).stops.offsets[2] = (was ?? 0) + 5;
    });
    expect(skyHistory.of(SKY).changes).toHaveLength(1);
    skyHistory.undo(SKY);
    expect(look("dusk").stops.offsets[2]).toBe(was);
  });

  it("the clock follows the code's hours, and the controls' while they are open", () => {
    for (const phase of SKY_PHASES)
      expect(skyKeyAt(SKY_SCHEDULE[phase][0])).toBe(phase);
    skyLab.active = true;
    const [start] = SKY_SCHEDULE.noon;
    changeSky("Noon: out of the clock", (c) => {
      (c.looks.noon as SkyLook).hours = null;
    });
    // An hour nothing holds is night.
    expect(skyKeyAt(start)).toBe("night");
  });

  it("a new time of day copies the open one, rides its phase, and takes hours from it", () => {
    skyLab.active = true;
    const id = addSkyPhase("dusk", "Golden hour");
    expect(skyLabel(id)).toBe("Golden hour");
    expect(look(id).stops).toEqual(look("dusk").stops);
    expect(look(id).hours).toBeNull();
    expect(skySwatch(id).scene).toEqual(look("dusk").scene);

    changeSky("Golden hour", (c) => {
      const l = c.looks[id] as SkyLook;
      l.stops.colors[0] = "#abcdef";
      l.theme = look("dusk").theme === "dark" ? "light" : "dark";
      l.hours = [...SKY_SCHEDULE.dusk];
    });
    // Until it is shown, dusk is still dusk.
    expect(skyStops("dusk").colors[0]).toBe(look("dusk").stops.colors[0]);
    showSky(id);
    expect(document.documentElement.dataset.skyPhase).toBe("dusk");
    expect(document.documentElement.dataset.effectiveTheme).toBe(
      look(id).theme,
    );
    expect(skyStops("dusk").colors[0]).toBe("#abcdef");
    expect(skyKeyAt(SKY_SCHEDULE.dusk[0])).toBe(id);
    showSky("dusk");
    expect(skyStops("dusk").colors[0]).toBe(look("dusk").stops.colors[0]);

    // Undo past its making takes it out of the sky too.
    showSky(id);
    skyHistory.goTo(SKY, -1);
    expect(skyLab.showing).toBeNull();
  });

  it("reads saved looks in over the code's, and refuses what holds none", () => {
    skyLab.active = true;
    const id = addSkyPhase("noon", "Storm");
    const saved = JSON.parse(JSON.stringify(skyLab.colours));
    skyLab.colours = defaultSkyColours();
    loadSkyColours({ looks: { [id]: saved.looks[id] }, custom: saved.custom });
    expect(skyLabel(id)).toBe("Storm");
    expect(look("noon")).toEqual(defaultSkyColours().looks.noon);
    expect(() => loadSkyColours({})).toThrow();
  });

  it("every phase's swatch holds known kinds and no more than a swatch may", () => {
    for (const scene of Object.values(SKY_SCENES)) {
      expect(scene.length).toBeLessThanOrEqual(SCENE_MAX);
      for (const item of scene) expect(SCENE_KINDS[item.kind]).toBeDefined();
    }
  });

  it("reads a swatch saved the short way as items, stars behind the sun or moon", () => {
    skyLab.active = true;
    loadSkyColours({
      looks: {
        noon: {
          scene: {
            body: { kind: "moon", x: 30, y: 31 },
            stars: [[10, 11, 0.7]],
          },
        },
      },
    } as never);
    expect(look("noon").scene.map((it) => [it.kind, it.x, it.y])).toEqual([
      ["star", 10, 11],
      ["moon", 30, 31],
    ]);
    // A swatch with neither sun nor moon keeps its stars alone.
    loadSkyColours({
      looks: {
        noon: { scene: { body: { kind: "none", x: 0, y: 0 }, stars: [] } },
      },
    } as never);
    expect(look("noon").scene).toEqual([]);
  });

  it("turns every colour in the code's tables to hue, strength, light and back", () => {
    for (const { colors } of Object.values(PHASE_STOPS)) {
      for (const hex of colors) {
        const back = hslToHex(...hexToHsl(hex));
        // Whole-number hue, strength and light lose a little: each channel stays close.
        for (const i of [1, 3, 5]) {
          const a = Number.parseInt(hex.slice(i, i + 2), 16);
          const b = Number.parseInt(back.slice(i, i + 2), 16);
          expect(Math.abs(a - b)).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it("travels in the saved sky text and loads alone", () => {
    let loaded: unknown;
    skyParts.colours = {
      data: () => ({ looks: 1 }),
      load: (d) => {
        loaded = d;
      },
    };
    expect(JSON.parse(skyText()).colours).toEqual({ looks: 1 });
    loadSkyText(JSON.stringify({ colours: { looks: 2 } }));
    expect(loaded).toEqual({ looks: 2 });
    delete skyParts.colours;
  });
});
