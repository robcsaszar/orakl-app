<!--
  Control panel for the sky's clouds, shown when the URL carries `?clouds`.
  It holds `cloudLab`, which the sky draws from while the panel is mounted:
  the sky's weather, every cloud's build and look, one cloud's size, name and
  painted shape. Settings stay in this browser between visits; "Save" hands
  every cloud over as text.
-->
<script lang="ts">
  import { SKY_PHASES, THEME_LABELS } from "@orakl/shared";
  import type { SkyPhase } from "@orakl/shared";
  import { onMount, tick, untrack } from "svelte";
  import { daySeed } from "@/lib/birds/seed";
  import {
    CLOUD_LIVE,
    CLOUD_MODEL,
    CLOUD_COPY,
    CLOUD_PRESETS,
    CLOUD_SETTINGS,
    type CloudEdit,
    type CloudModel,
    CloudPainter,
    type CloudPreset,
    cloudFits,
    type CloudSettings,
    skyClouds,
    templateOver,
  } from "@/lib/sky-clouds";
  import { skyStops, skyTint } from "@/lib/sky-colours-lab.svelte";
  import { CLOUD_NAMES } from "./cloud-names";
  import {
    ALL_CLOUDS,
    clearAllCloudHistory,
    clearCloudHistory,
    cloudEdit,
    cloudHistory,
    cloudHistoryIds,
    cloudLab,
    cloudProgress,
    cloudSnapshot,
    cloudStage,
    goToCloudChange,
    loadCloudHistory,
    logCloudChange,
    progressForCentre,
    redoCloud,
    setCloudProgress,
    showCloud,
    undoCloud,
  } from "@/lib/sky-clouds-lab.svelte";
  import { showSky } from "@/lib/sky-colours-lab.svelte";
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import { windFor } from "@/lib/sky-wind";
  import Button from "@/lib/components/ui/Button.svelte";
  import SkySwatch from "@/lib/components/SkySwatch.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import ConfirmButton from "@/lib/components/ui/ConfirmButton.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import type { RoleName } from "$lib/icons";
  import Input from "@/lib/components/ui/Input.svelte";
  import Progress from "@/lib/components/ui/Progress.svelte";
  import SegmentedPicker from "@/lib/components/ui/SegmentedPicker.svelte";
  import Select from "@/lib/components/ui/Select.svelte";
  import Slider from "@/lib/components/ui/Slider.svelte";
  import SwitchField from "@/lib/components/ui/SwitchField.svelte";
  import Tabs from "@/lib/components/ui/Tabs.svelte";
  import CloudPaint, { type PaintPrefs } from "./CloudPaint.svelte";
  import SkyBarTool from "./SkyBarTool.svelte";
  import SkyPanel from "./SkyPanel.svelte";
  import SkyReset from "./SkyReset.svelte";
  import SkyResetAll from "./SkyResetAll.svelte";
  import { hinted, keepNow, keepSoon, skyFolds, skyParts, skyTab as openTab, skyTabs, skyView, ui } from "./sky-panel.svelte";

  let {
    shown = true,
    open = $bindable(true),
    modes = [],
    onmode,
  }: {
    /** False while the other half of the sky controls is the one open. */
    shown?: boolean;
    open?: boolean;
    modes?: { key: string; label: string }[];
    onmode?: (key: string) => void;
  } = $props();

  const STORE = "orakl-cloud-lab";
  /** How many times faster than real the preview plays. */
  /** How many times faster than real the sky may be watched at. */
  const RATES = [
    { key: "1", label: "Real time" },
    { key: "2", label: "2×" },
    { key: "4", label: "4×" },
    { key: "8", label: "8×" },
  ];
  /** The whole sky has its own tabs, one cloud has its own: no tab is ever a dead end. */
  const SKY_TABS = [
    { key: "sky", label: "Sky" },
    { key: "shape", label: "Shape" },
    { key: "motion", label: "Motion" },
  ];
  /** The settings the Sky and Motion tabs hold, and the ones of a cloud's own on the Cloud tab. */
  const SKY_KEYS = ["count", "opacity", "speed", "shapes", "baseSeed"] as const;
  const MOTION_KEYS = ["variation", "variationPeriod"] as const;
  const CLOUD_KEYS = ["name", "top", "width", "height", "seed", "rarity", "phases"] as const;
  const CLOUD_TABS = [
    { key: "cloud", label: "Cloud" },
    { key: "shape", label: "Shape" },
    { key: "paint", label: "Paint" },
  ];

  /** One number of the cloud model, as a slider in plain words. */
  interface Knob {
    key: keyof CloudModel;
    label: string;
    hint: string;
    min: number;
    max: number;
    step: number;
    /** Names for the slider's stretches, low to high; shown in place of the number. */
    words?: string[];
  }
  /** A headline and the knobs under it. */
  interface Group {
    title: string;
    knobs: Knob[];
  }
  const BUILD: Group[] = [
    {
      title: "Body",
      knobs: [
        { key: "aspect", label: "Frame", hint: "The box the cloud is built in.", min: 0.6, max: 4, step: 0.1, words: ["tower", "tall", "balanced", "wide", "sheet"] },
        { key: "body", label: "Big lumps", hint: "How many big lumps make the body.", min: 1, max: 10, step: 1 },
        { key: "size", label: "Lump size", hint: "How big each big lump is.", min: 0.3, max: 1.6, step: 0.05, words: ["small", "medium", "large"] },
        { key: "stretch", label: "Lump shape", hint: "Round lumps make puffy clouds. Long lumps make flat layers.", min: 0.5, max: 4, step: 0.1, words: ["round", "oval", "long", "very long"] },
        { key: "spread", label: "Spread", hint: "How far apart the big lumps sit, side to side.", min: 0.2, max: 1.8, step: 0.05, words: ["bunched", "close", "apart", "far apart"] },
        { key: "scatter", label: "Scatter", hint: "Whether the lumps line up or sit at different heights.", min: 0, max: 1, step: 0.05, words: ["in a row", "loose", "scattered"] },
      ],
    },
    {
      title: "Bumps",
      knobs: [
        { key: "tower", label: "Bumps on each lump", hint: "Smaller bumps that grow on every big lump.", min: 0, max: 6, step: 1 },
        { key: "detail", label: "Bumps on each bump", hint: "Even smaller bumps that grow on every bump.", min: 0, max: 6, step: 1 },
        { key: "depth", label: "Bump layers", hint: "How many times bumps grow on bumps. More is fluffier.", min: 0, max: 4, step: 1 },
        { key: "lobe", label: "Bump size", hint: "Whether bumps get smaller or bigger as they pile up.", min: 0.6, max: 1.5, step: 0.05, words: ["shrinking", "even", "swelling"] },
        { key: "rise", label: "Climb", hint: "How high the bumps pile up.", min: 0.2, max: 2, step: 0.05, words: ["low", "medium", "high", "towering"] },
      ],
    },
    {
      title: "Extras",
      knobs: [
        { key: "shear", label: "Lean", hint: "Tips the cloud to one side, as wind does.", min: -1, max: 1, step: 0.05, words: ["far left", "left", "upright", "right", "far right"] },
        { key: "anvil", label: "Flat top", hint: "Squashes the top flat and wide, like a storm cloud.", min: 0, max: 1, step: 0.05, words: ["off", "slight", "flat", "very flat"] },
        { key: "filaments", label: "Wisps", hint: "Thin streaks that trail off the outer bumps.", min: 0, max: 6, step: 1 },
      ],
    },
  ];
  const LOOK: Group[] = [
    {
      title: "Edges and thickness",
      knobs: [
        { key: "softness", label: "Edges", hint: "How sharp each lump's edge is.", min: 0, max: 1, step: 0.05, words: ["crisp", "soft", "hazy"] },
        { key: "peak", label: "Thickness", hint: "How solid the lumps are.", min: 0.2, max: 1, step: 0.02, words: ["thin", "medium", "thick"] },
        { key: "cap", label: "Thickest spot", hint: "The most solid any spot of the cloud can get.", min: 0.5, max: 1, step: 0.02, words: ["sheer", "dense", "solid"] },
      ],
    },
    {
      title: "Speckle",
      knobs: [
        { key: "grain", label: "Speckle", hint: "Small light and dark specks all over the cloud.", min: 0, max: 0.8, step: 0.05, words: ["none", "light", "strong"] },
        { key: "grainScale", label: "Speck size", hint: "How big each speck is.", min: 4, max: 48, step: 1, words: ["big", "medium", "small", "tiny"] },
        { key: "grainOctaves", label: "Speck detail", hint: "Plain specks, or specks within specks.", min: 1, max: 6, step: 1, words: ["plain", "some", "rich"] },
      ],
    },
    {
      title: "Patches",
      knobs: [
        { key: "mid", label: "Patches", hint: "Big thick patches next to thin ones.", min: 0, max: 0.8, step: 0.05, words: ["none", "light", "strong"] },
        { key: "midScale", label: "Patch size", hint: "How big each patch is.", min: 2, max: 16, step: 1, words: ["big", "medium", "small", "tiny"] },
        { key: "midOctaves", label: "Patch detail", hint: "Plain patches, or patches within patches.", min: 1, max: 4, step: 1, words: ["plain", "some", "rich"] },
      ],
    },
    {
      title: "Fades",
      knobs: [
        { key: "fade", label: "Bottom fade", hint: "How much of the bottom melts into the sky.", min: 0.3, max: 1, step: 0.02, words: ["most of it", "half", "a little", "none"] },
        { key: "top", label: "Top fade", hint: "How much of the top melts into the sky.", min: 0, max: 0.3, step: 0.02, words: ["none", "a little", "a lot"] },
      ],
    },
  ];
  const KNOBS = [...BUILD, ...LOOK].flatMap((g) => g.knobs);

  /** The word for a value: the range cut into as many stretches as there are words. */
  const wordAt = (words: string[], min: number, max: number) => (v: number) =>
    words[Math.min(words.length - 1, Math.max(0, Math.floor(((v - min) / (max - min)) * words.length)))] ?? "";

  const S = $derived(cloudLab.settings);
  const today = daySeed(new Date());
  const clouds = $derived(skyClouds(cloudLab.daySeed ?? today, S));
  const id = $derived(cloudLab.editing);
  const picked = $derived(clouds.find((c) => c.id === id) ?? null);
  const scoped = $derived<CloudModel>({ ...CLOUD_MODEL, ...S.model, ...(picked ? S.edits[picked.id]?.model : {}) });
  /** Whose history is shown and undone: the picked cloud's, or the settings every cloud shares. */
  const scope = $derived(picked ? picked.id : ALL_CLOUDS);
  const history = $derived(cloudHistory(scope));

  /** Every template: the code's recipes, with the panel's own added and laid over them. */
  const presets = $derived<Record<string, CloudPreset>>({ ...CLOUD_PRESETS, ...S.templates });
  // The template the settings match, and failing that the one they sit closest to.
  const template = $derived.by(() => {
    let best = { name: "", distance: Infinity };
    for (const [name, preset] of Object.entries(presets)) {
      const target = { ...CLOUD_MODEL, ...preset.model };
      let distance = Math.abs(target.flatBase - scoped.flatBase);
      for (const k of KNOBS) distance += Math.abs(target[k.key] - scoped[k.key]) / (k.max - k.min);
      if (distance < best.distance) best = { name, distance };
    }
    return { name: best.name, exact: best.distance < 1e-6 };
  });
  const nameOf = (c: { id: number; name: string }) => (c.name ? `Cloud ${c.id + 1}, ${c.name}` : `Cloud ${c.id + 1}`);

  /** What the panel shows under the cloud list: the settings, or one of the top bar's two tools. */
  let skyTab = $state(openTab("clouds", SKY_TABS, "sky"));
  let cloudTab = $state(openTab("clouds", CLOUD_TABS, "cloud"));
  const tabs = $derived(picked ? CLOUD_TABS : SKY_TABS);
  const tab = $derived(picked ? cloudTab : skyTab);
  $effect(() => {
    skyTabs.clouds = tab;
  });
  /** The hint for the setting under the pointer or in focus; shown in the bar at the foot of the panel. */
  /** The model knob in use, which shows its exact number. */
  let activeKnob = $state<string | null>(null);
  /** Groups folded shut, by title. */
  const folded = skyFolds("clouds");
  /** A small picture of each template, drawn by the engine once the panel is up. */
  let shots = $state<Record<string, string>>({});
  let savedNote = $state(false);
  let small = $state(false);
  let phase = $state<SkyPhase>("noon");
  let clock = $state(0);
  let stats = $state({ avg: 0, p95: 0, long: 0, paint: 0, drawn: 0, parts: 0 });
  const prefs = $state<PaintPrefs>({
    tool: "auto",
    shape: "brush",
    brush: 1,
    strength: 2,
    hardness: 1,
    faint: true,
    ring: true,
    mirror: false,
    mirrorAngle: 90,
    large: false,
    grab: true,
  });
  /** Where the slow reshaping stands in its cycle, 0 to 1; read from the sky a few times a second. */
  let reshaping = $state(0);
  /** The speed the preview plays at when it plays. */

  const num = (v: number) => String(+v.toFixed(2));
  const compact = ui.compact;
  const track = `${ui.slider} [&_input]:bg-secondary/25`;
  const hintCls = ui.hint;
  const heading = ui.heading;
  const group = ui.group;
  const confirmCls = ui.confirm;

  /** A tiny live picture of one cloud, redrawn whenever the sky repaints it. */
  function thumb(node: HTMLCanvasElement, cloudId: number) {
    const draw = (painted: number) => {
      const source = cloudStage.painters.get(cloudId)?.canvas;
      const g = node.getContext("2d");
      if (painted !== cloudId || !source || !g) return;
      g.clearRect(0, 0, node.width, node.height);
      const k = Math.min(node.width / source.width, node.height / source.height);
      g.drawImage(source, (node.width - source.width * k) / 2, (node.height - source.height * k) / 2, source.width * k, source.height * k);
    };
    cloudStage.painted.add(draw);
    draw(cloudId);
    return { destroy: () => void cloudStage.painted.delete(draw) };
  }

  /** Makes a change to a cloud (or to all, by `ALL_CLOUDS`) and writes it into that cloud's history. */
  function change(target: number, label: string, apply: () => void) {
    const before = cloudSnapshot(target);
    apply();
    logCloudChange(target, label, before);
  }
  const repaint = (which?: number) => tick().then(() => cloudStage.repaint(which));
  let savedTimer: ReturnType<typeof setTimeout> | undefined;
  /** True while this part is on screen; its clocks and counters rest otherwise. */
  const seen = $derived(shown && open);

  // Load what was kept, take over the sky, and hand it back on the way out.
  onMount(() => {
    const listeners = new AbortController();
    try {
      const kept = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (kept) {
        cloudLab.settings = { ...structuredClone(CLOUD_SETTINGS), ...kept.settings };
        cloudLab.wind = kept.wind ?? null;
        cloudLab.daySeed = kept.daySeed ?? null;
        // Paint settings kept by an earlier build of the panel lack some of today's.
        if (kept.v === 2) Object.assign(prefs, kept.prefs);
      }
    } catch {
      // nothing kept, or not readable: the day's clouds
    }
    loadCloudHistory();
    cloudLab.active = true;
    skyParts.clouds = {
      label: "Clouds",
      data: cloudData,
      load: loadClouds,
      // One line of changes for the whole sky, and one for each cloud that has been changed.
      timelines: () =>
        cloudHistoryIds().map((id) => {
          const cloud = clouds.find((c) => c.id === id);
          return {
            name: id === ALL_CLOUDS ? "Whole sky" : cloud ? nameOf(cloud) : `Cloud ${id + 1}`,
            ...cloudHistory(id),
            goTo: (i) => {
              goToCloudChange(id, i);
              repaint();
            },
            forget: () => clearCloudHistory(id),
          };
        }),
      resetLabel: "Put the clouds back",
      resetNote: "Puts back today's clouds as they come, and forgets every cloud change and all cloud history. The sky, stars and birds stay.",
      reset: startOver,
      extra: cloudExtra,
    };
    // On a small screen the panel takes the bottom half and the clouds keep the top.
    const narrow = matchMedia("(max-width: 639px)");
    const measure = () => (small = narrow.matches);
    measure();
    narrow.addEventListener("change", measure, { signal: listeners.signal });
    document.querySelector<HTMLElement>('[aria-label="Cloud controls"]')?.focus({ preventScroll: true });
    const unsubscribe = subscribeSkyPhase((p) => (phase = p));

    const frames: number[] = [];
    let long = 0;
    let last = 0;
    let frame = requestAnimationFrame(function loop(t) {
      frame = requestAnimationFrame(loop);
      // Read every frame so the preview's bar moves as smoothly as the clouds.
      const period = S.variationPeriod * 1000;
      if (seen) reshaping = (cloudStage.clock % period) / period;
      if (last && !document.hidden) {
        const d = t - last;
        frames.push(d);
        if (frames.length > 240) frames.shift();
        if (d > 33) long++;
      }
      last = t;
    });
    const timer = setInterval(() => {
      if (!seen) return;
      clock++;
      if (skyView.view !== "save" || frames.length < 10) return;
      const sorted = [...frames].sort((a, b) => a - b);
      const painters = [...cloudStage.painters.values()];
      stats = {
        avg: frames.reduce((a, b) => a + b, 0) / frames.length,
        p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
        long,
        paint: painters.reduce((a, p) => a + p.ms, 0) / Math.max(1, painters.length),
        drawn: painters.length,
        parts: document.querySelectorAll(".sky-cloud, .sky-cloud *").length,
      };
    }, 1000);
    return () => {
      keepNow();
      cloudLab.active = false;
      delete skyParts.clouds;
      cloudLab.editing = -1;
      cloudLab.paused = false;
      cloudLab.tags = false;
      cloudLab.rate = 1;
      cloudLab.skyShare = 1;
      listeners.abort();
      unsubscribe();
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  });

  $effect(() => {
    const text = JSON.stringify({ v: 2, settings: S, wind: cloudLab.wind, daySeed: cloudLab.daySeed, prefs });
    if (!cloudLab.active) return;
    keepSoon(STORE, text, () => {
      savedNote = true;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => (savedNote = false), 1500);
    });
  });

  $effect(() => {
    cloudLab.skyShare = small && open ? 0.5 : 1;
  });

  // A cloud that leaves the sky cannot stay picked.
  $effect(() => {
    if (id >= 0 && !picked) cloudLab.editing = -1;
  });

  const setPhase = (p: SkyPhase) => showSky(p);

  function setKnob(key: keyof CloudModel, label: string, value: number) {
    change(scope, `Changed ${label.toLowerCase()}`, () => {
      if (picked) {
        const edit = cloudEdit(picked.id);
        edit.model = { ...edit.model, [key]: value };
      } else S.model = { ...S.model, [key]: value };
    });
    repaint(picked?.id);
  }

  /** Whether a knob has its own value here: on one cloud, apart from the whole sky; on the whole sky, apart from the start. */
  const changed = (key: keyof CloudModel) =>
    picked ? S.edits[picked.id]?.model?.[key] !== undefined : S.model[key] !== CLOUD_SETTINGS.model[key];

  /** Puts one knob back: a cloud follows the whole sky again, the whole sky returns to the start. */
  function resetKnob(key: keyof CloudModel, label: string) {
    change(scope, `Reset ${label.toLowerCase()}`, () => {
      if (picked) {
        const { [key]: _own, ...rest } = cloudEdit(picked.id).model ?? {};
        cloudEdit(picked.id).model = rest;
      } else {
        const { [key]: _own, ...rest } = S.model;
        const start = CLOUD_SETTINGS.model[key];
        S.model = start === undefined ? rest : { ...rest, [key]: start };
      }
    });
    repaint(picked?.id);
  }

  /** A design's share of the clouds drawn at the time of day in the sky now, in words. */
  function shareOf(cloudId: number): string {
    const fits = clouds.filter((c) => cloudFits(c, phase));
    const me = fits.find((c) => c.id === cloudId);
    const total = fits.reduce((sum, c) => sum + c.rarity, 0);
    if (!me || total <= 0) return clouds.find((c) => c.id === cloudId)?.rarity ? "not at this time" : "never";
    const share = me.rarity / total;
    return share > 0.95 ? "every cloud" : share >= 0.4 ? `${Math.round(share * 100)}% of clouds` : `1 in ${Math.round(1 / share)} clouds`;
  }

  /** Takes the picked cloud's own values for some of its settings away, so it is as the day made it. */
  function resetEdit(keys: (keyof CloudEdit)[], label: string) {
    if (!picked) return;
    const id = picked.id;
    change(id, label, () => {
      const edit = cloudEdit(id);
      for (const key of keys) delete edit[key];
    });
    repaint(id);
  }

  /** Whether the open tab holds anything that is not as it starts. */
  const tabChanged = $derived.by(() => {
    const edit = picked ? S.edits[picked.id] : undefined;
    if (tab === "sky")
      return cloudLab.wind !== null || cloudLab.daySeed !== null || SKY_KEYS.some((key) => S[key] !== CLOUD_SETTINGS[key]);
    if (tab === "motion") return MOTION_KEYS.some((key) => S[key] !== CLOUD_SETTINGS[key]);
    if (tab === "shape")
      return picked ? Object.keys(edit?.model ?? {}).length > 0 : JSON.stringify(S.model) !== JSON.stringify(CLOUD_SETTINGS.model);
    if (tab === "cloud") return CLOUD_KEYS.some((key) => edit?.[key] !== undefined);
    if (tab === "paint") return Object.keys(edit?.paint ?? {}).length > 0;
    return false;
  });
  const tabWhat = $derived(
    tab === "sky"
      ? "the weather, the number of clouds and the layout"
      : tab === "motion"
        ? "how the clouds change shape"
        : tab === "shape"
          ? picked
            ? "this cloud's own shape, so it follows the whole sky"
            : "the shape every cloud shares"
          : tab === "cloud"
            ? "this cloud's name, how often it shows, place and size"
            : "everything painted on this cloud",
  );
  /** Resets every setting on the open tab, as one change where the tab has a history. */
  function resetTab() {
    if (tab === "sky") {
      cloudLab.wind = null;
      cloudLab.daySeed = null;
      for (const key of SKY_KEYS) S[key] = CLOUD_SETTINGS[key];
    } else if (tab === "motion") {
      for (const key of MOTION_KEYS) S[key] = CLOUD_SETTINGS[key];
    } else if (tab === "shape") {
      change(scope, "Reset all: shape", () => {
        if (picked) cloudEdit(picked.id).model = {};
        else S.model = structuredClone(CLOUD_SETTINGS.model);
      });
    } else if (tab === "cloud") resetEdit([...CLOUD_KEYS], "Reset all: cloud");
    else if (tab === "paint") resetEdit(["paint", "hardness"], "Reset all: paint");
    repaint(picked?.id);
  }

  // One small picture per template, in still air; made a moment after the panel is up or a template changes, so neither stalls.
  let pictured: Record<string, string> = {};
  $effect(() => {
    const all = Object.entries(presets).map(([name, preset]) => [name, $state.snapshot(preset) as CloudPreset, JSON.stringify(preset)] as const);
    const picturing = setTimeout(() => {
      const pictures: Record<string, string> = {};
      const kept: Record<string, string> = {};
      for (const [name, preset, text] of all) {
        kept[name] = text;
        const had = untrack(() => shots[name]);
        if (pictured[name] === text && had) {
          pictures[name] = had;
          continue;
        }
        const painter = new CloudPainter(document.createElement("canvas"), 0xc10d, 192);
        painter.paint(0, ["#ffffff", "#ffffff"], 0, { ...CLOUD_MODEL, ...preset.model }, { ...CLOUD_LIVE, variation: 0 }, preset.paint, preset.hardness);
        pictures[name] = painter.canvas.toDataURL("image/png");
      }
      pictured = kept;
      shots = pictures;
    }, 200);
    return () => clearTimeout(picturing);
  });

  /** The name typed for a new template. */
  let templateName = $state("");
  const newName = $derived(templateName.trim().toLowerCase());
  /** The shape in hand as a template: the picked cloud's, with its width and paint, or the one every cloud shares. */
  function shapeNow(): CloudPreset {
    const model: Partial<CloudModel> = {};
    for (const key of Object.keys(CLOUD_MODEL) as (keyof CloudModel)[]) if (scoped[key] !== CLOUD_MODEL[key]) model[key] = scoped[key];
    if (!picked) return { model };
    const edit = $state.snapshot(S.edits[picked.id] ?? {}) as CloudEdit;
    return {
      model,
      width: Math.round(picked.width),
      ...(edit.paint && Object.keys(edit.paint).length ? { paint: edit.paint } : {}),
      ...(edit.hardness && Object.keys(edit.hardness).length ? { hardness: edit.hardness } : {}),
    };
  }
  /** Whether the shape in hand is the named template to the letter, paint and all. */
  const sameAs = (name: string) => {
    const preset = presets[name];
    if (!preset) return false;
    const now = shapeNow();
    return (
      JSON.stringify({ ...CLOUD_MODEL, ...now.model }) === JSON.stringify({ ...CLOUD_MODEL, ...preset.model }) &&
      JSON.stringify(now.paint ?? {}) === JSON.stringify(preset.paint ?? {}) &&
      JSON.stringify(now.hardness ?? {}) === JSON.stringify(preset.hardness ?? {})
    );
  };
  /** Keeps the shape in hand as a template of that name: a new one, or in place of the one that has it. */
  function saveTemplate(name: string) {
    if (!name) return;
    S.templates = { ...S.templates, [name]: shapeNow() };
    templateName = "";
  }
  /** Takes a template of the panel's away: one of its own goes, a recipe of the code's is as the code has it again. */
  function dropTemplate(name: string) {
    const { [name]: _gone, ...rest } = S.templates;
    S.templates = rest;
  }

  function applyTemplate(name: string) {
    const preset = presets[name];
    if (!preset) return;
    change(scope, `Used the ${name} template`, () => {
      if (picked) {
        const edit = cloudEdit(picked.id);
        // The whole template, not a mix of it and the model every cloud shares.
        edit.model = templateOver(preset, S.model);
        // A template made from a painted cloud brings its paint; one without leaves the cloud's paint alone.
        if (preset.paint) {
          edit.paint = structuredClone($state.snapshot(preset.paint));
          edit.hardness = structuredClone($state.snapshot(preset.hardness ?? {}));
        }
        if (preset.width) setWidth(picked.id, preset.width);
      } else S.model = { ...preset.model };
    });
    if (!picked) {
      // A template for all clouds overrides what single clouds had set for themselves.
      for (const c of clouds) {
        change(c.id, `Used the ${name} template`, () => {
          const edit = S.edits[c.id];
          if (edit) delete edit.model;
          if (preset.width) cloudEdit(c.id).width = preset.width;
        });
      }
    }
    repaint();
  }

  /** A new width, with the cloud's centre held: drift is measured in the cloud's own width. */
  async function setWidth(target: number, width: number) {
    const r = cloudStage.els.get(target)?.getBoundingClientRect();
    cloudEdit(target).width = width;
    await tick();
    if (r) setCloudProgress(target, progressForCentre(target, r.left + r.width / 2));
  }

  function pick(next: number) {
    cloudLab.editing = next;
    if (next >= 0) tick().then(() => showCloud(next));
  }

  async function addCloud() {
    const had = new Set(clouds.map((c) => c.id));
    S.count = Math.min(40, S.count + 1);
    await tick();
    const made = clouds.find((c) => !had.has(c.id));
    if (made) pick(made.id);
  }

  function undoAll() {
    goToCloudChange(scope, -1);
    repaint();
  }

  function remove() {
    if (!picked || clouds.length <= 1) return;
    S.removed = [...S.removed, picked.id];
    S.count = Math.max(1, S.count - 1);
    cloudLab.editing = -1;
  }

  /** Rolls a different cloud from the same settings. */
  function newCloud() {
    if (!picked) return;
    change(picked.id, "Rolled a new cloud", () => {
      cloudEdit(picked.id).seed = 1 + Math.floor(Math.random() * 999_983);
    });
  }

  function rename(text: string) {
    if (!picked) return;
    change(picked.id, "Renamed the cloud", () => {
      if (text) cloudEdit(picked.id).name = text;
      else delete cloudEdit(picked.id).name;
    });
  }

  const randomName = () => rename(CLOUD_NAMES[Math.floor(Math.random() * CLOUD_NAMES.length)] ?? "");

  /** Adds a second cloud just like the picked one, and picks it. */
  async function copyAsNew() {
    if (!picked) return;
    const { top: _top, ...look } = $state.snapshot(S.edits[picked.id] ?? {}) as CloudEdit;
    const seed = picked.seed;
    const had = new Set(clouds.map((c) => c.id));
    S.count = Math.min(40, S.count + 1);
    await tick();
    const made = clouds.find((c) => !had.has(c.id));
    if (!made) return;
    change(made.id, "Copied from another cloud", () => {
      S.edits[made.id] = { ...look, seed, ...(look.name ? { name: `${look.name} copy` } : {}) };
    });
    pick(made.id);
  }

  /** One step back or forward in the history. */
  function step(by: -1 | 1) {
    if (by < 0) undoCloud(scope);
    else redoCloud(scope);
    repaint();
  }

  // Everything, as text: the sky's settings, the build every cloud shares, and each cloud.
  function cloudData() {
    void clock;
    return {
        sky: {
          count: S.count,
          inSky: S.inSky,
          opacity: S.opacity,
          speed: S.speed,
          wind: cloudLab.wind,
          daySeed: cloudLab.daySeed,
          shapes: S.shapes,
          baseSeed: S.baseSeed,
          variation: S.variation,
          variationPeriod: S.variationPeriod,
          interval: S.interval,
        },
        model: { ...CLOUD_MODEL, ...S.model },
        templates: S.templates,
        clouds: clouds.map((c) => ({
          id: c.id,
          name: c.name,
          rarity: c.rarity,
          phases: c.phases,
          seed: c.seed,
          top: +c.top.toFixed(1),
          width: +c.width.toFixed(1),
          height: c.height,
          rot: +c.rot.toFixed(2),
          opacity: +c.opacity.toFixed(2),
          flip: c.flip,
          at: +cloudProgress(c.id).toFixed(3),
          model: c.model,
          paint: c.paint,
          hardness: c.hardness,
        })),
    };
  }

  /** Puts saved clouds in place of the ones in the sky. */
  function loadClouds(data: {
    sky?: Partial<CloudSettings> & { wind?: number | null; daySeed?: number | null };
    model?: Partial<CloudModel>;
    templates?: Record<string, CloudPreset>;
    clouds: (CloudEdit & { id: number; model?: CloudModel })[];
  }) {
      const shared: Partial<CloudModel> = {};
      for (const key of Object.keys(CLOUD_MODEL) as (keyof CloudModel)[]) {
        const v = data.model?.[key];
        if (typeof v === "number" && v !== CLOUD_MODEL[key]) shared[key] = v;
      }
      const base = { ...CLOUD_MODEL, ...shared };
      const ids = data.clouds.map((c) => c.id);
      const edits: Record<number, CloudEdit> = {};
      for (const c of data.clouds) {
        const own: Partial<CloudModel> = {};
        for (const key of Object.keys(CLOUD_MODEL) as (keyof CloudModel)[]) {
          const v = c.model?.[key];
          if (typeof v === "number" && v !== base[key]) own[key] = v;
        }
        edits[c.id] = {
          ...(c.name ? { name: c.name } : {}),
          ...(typeof c.rarity === "number" && c.rarity !== 1 ? { rarity: c.rarity } : {}),
          ...(Array.isArray(c.phases) ? { phases: c.phases } : {}),
          seed: c.seed,
          top: c.top,
          width: c.width,
          height: c.height,
          ...(Object.keys(own).length ? { model: own } : {}),
          ...(c.paint && Object.keys(c.paint).length ? { paint: c.paint } : {}),
          ...(c.hardness && Object.keys(c.hardness).length ? { hardness: c.hardness } : {}),
        };
      }
      const { wind, daySeed: day, ...sky } = data.sky ?? {};
      cloudLab.settings = {
        ...structuredClone(CLOUD_SETTINGS),
        ...sky,
        model: shared,
        // A saved sky with no templates of its own leaves the ones here alone.
        templates: data.templates ?? $state.snapshot(S.templates),
        edits,
        count: ids.length,
        removed: Array.from({ length: Math.max(...ids) + 1 }, (_, i) => i).filter((i) => !ids.includes(i)),
      };
      cloudLab.wind = wind ?? null;
      cloudLab.daySeed = day ?? null;
      cloudLab.editing = -1;
      clearAllCloudHistory();
      repaint();
  }

  function startOver() {
    // The templates are not the sky's clouds: they stay.
    cloudLab.settings = { ...structuredClone(CLOUD_SETTINGS), templates: $state.snapshot(S.templates) };
    cloudLab.wind = null;
    cloudLab.daySeed = null;
    cloudLab.editing = -1;
    clearAllCloudHistory();
    repaint();
  }

  function onKey(e: KeyboardEvent) {
    const typing = /^(text|number|search)$/.test((document.activeElement as HTMLInputElement | null)?.type ?? "") || document.activeElement?.tagName === "TEXTAREA";
    if (!shown) return;
    if (e.key === "Escape" && open && !typing) {
      open = false;
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || typing || !open) return;
    e.preventDefault();
    step(e.shiftKey ? 1 : -1);
  }

  // Grabbing: the topmost cloud with paint under the pointer follows it, along its path and up and down.
  let drag: { id: number; x: number; y: number; p: number; top: number; travel: number; dir: number; moved: boolean; before: string } | null = null;

  function cloudAt(x: number, y: number): number {
    for (const c of [...cloudStage.clouds].reverse()) {
      // Only a design that can be seen is grabbed, not a second showing of one.
      if ((id >= 0 && c.id !== id) || c.id >= CLOUD_COPY || !cloudStage.live.has(c.id)) continue;
      const el = cloudStage.els.get(c.id);
      const painter = cloudStage.painters.get(c.id);
      if (!el || !painter) continue;
      const r = el.getBoundingClientRect();
      let u = (x - r.left) / r.width;
      const v = 0.5 + (y - (r.top + r.height / 2)) / (r.height * c.height);
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      if (c.flip < 0) u = 1 - u;
      const { canvas } = painter;
      const px = canvas
        .getContext("2d")
        ?.getImageData(Math.min(canvas.width - 1, Math.floor(u * canvas.width)), Math.min(canvas.height - 1, Math.floor(v * canvas.height)), 1, 1).data;
      if (px && (px[3] as number) > 8) return c.id;
    }
    return -1;
  }

  function grabDown(e: PointerEvent) {
    const hit = cloudAt(e.clientX, e.clientY);
    const el = cloudStage.els.get(hit);
    const c = cloudStage.clouds.find((x) => x.id === hit);
    if (!el || !c) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = {
      id: hit,
      x: e.clientX,
      y: e.clientY,
      p: cloudProgress(hit),
      top: c.top,
      travel: 1.1 * (window.innerWidth + el.offsetWidth),
      dir: cloudStage.motion?.dir ?? 1,
      moved: false,
      before: cloudSnapshot(hit),
    };
  }

  function grabMove(e: PointerEvent) {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
    setCloudProgress(drag.id, drag.p + ((e.clientX - drag.x) / drag.travel) * drag.dir);
    cloudEdit(drag.id).top = +Math.max(-20, Math.min(90, drag.top + ((e.clientY - drag.y) / window.innerHeight) * 100)).toFixed(1);
  }

  function grabUp() {
    if (drag && !drag.moved) cloudLab.editing = drag.id;
    else if (drag) logCloudChange(drag.id, "Moved the cloud", drag.before);
    drag = null;
  }
</script>

<svelte:window onkeydown={onKey} />

{#snippet pill(o: { key: string; label: string })}{o.label}{/snippet}
<!-- On the save page, under the start-over buttons. -->
{#snippet cloudExtra()}
  <section class={group} aria-label="How hard the device works">
    <h3 class={heading}>How hard the device works</h3>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
      <dt class="text-foreground-darker">Time per frame</dt>
      <dd>{stats.avg.toFixed(1)} ms</dd>
      <dt class="text-foreground-darker">Slowest frames</dt>
      <dd>{stats.p95.toFixed(1)} ms</dd>
      <dt class="text-foreground-darker">Stutters so far</dt>
      <dd>{stats.long}</dd>
      <dt class="text-foreground-darker">Time to draw a cloud</dt>
      <dd>{stats.paint.toFixed(1)} ms</dd>
      <dt class="text-foreground-darker">Clouds drawn</dt>
      <dd>{stats.drawn}</dd>
      <dt class="text-foreground-darker">Page parts used</dt>
      <dd>{stats.parts}</dd>
    </dl>
    <p class={hintCls}>Under 17 ms per frame is smooth. Many stutters mean too many clouds or redrawing too often.</p>
    <div use:hinted={"How often each cloud is drawn again. Often is smoother and works the device harder."}>
      <Slider
        id="cloud-interval"
        size="sm"
        label="Redraw"
        min={100}
        max={3000}
        step={50}
        value={S.interval}
        format={(v) => `${v < 300 ? "very often" : v < 800 ? "often" : v < 1800 ? "now and then" : "rarely"}`}
        class={track}
        oninput={(e) => (S.interval = Number(e.currentTarget.value))}>
        {#snippet labelEnd()}<SkyReset label="Redraw" changed={S.interval !== CLOUD_SETTINGS.interval} onclick={() => (S.interval = CLOUD_SETTINGS.interval)} />{/snippet}
      </Slider>
    </div>
  </section>
{/snippet}

{#snippet action(label: string, onclick: () => void, disabled = false)}
  <Button variant={disabled ? "disabled" : "outline"} intent="compact" radius="rounded" class={compact} {disabled} {onclick}>{label}</Button>
{/snippet}
<!-- A button that asks first; it holds its place, dim and still, while it has nothing to do. -->
{#snippet ask(label: string, question: string, onConfirm: () => void, live: boolean, hint: string, mark: RoleName = "confirm")}
  <span class="flex transition-opacity duration-150 motion-reduce:transition-none {live ? '' : 'pointer-events-none opacity-40'}" inert={!live} use:hinted={hint}>
    <ConfirmButton {label} confirmLabel={question} confirmVariant="danger" variant="outline" revealDelay={0} duration={4000} {onConfirm} class={confirmCls}>
      {#snippet icon()}<Icon name={mark} size="xs" />{/snippet}
      {#snippet confirmIcon()}<Icon name="confirm" size="xs" />{/snippet}
    </ConfirmButton>
  </span>
{/snippet}
{#snippet iconAction(name: RoleName, label: string, onclick: () => void, disabled = false)}
  <Button variant={disabled ? "disabled" : "outline"} intent="compact" radius="rounded" class="p-2" aria-label={label} data-tooltip={label} {disabled} {onclick}>
    <Icon {name} size="sm" />
  </Button>
{/snippet}
{#snippet barTool(name: RoleName, label: string, onclick: () => void, o: { pressed?: boolean; disabled?: boolean } = {})}
  <SkyBarTool {name} {label} {onclick} {...o} />
{/snippet}
{#snippet fold(title: string)}
  <h3 class={heading}>
    <Button
      unstyled
      aria-expanded={!folded[title]}
      class="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center justify-between rounded-lg px-1 py-0.5 text-left hover:bg-secondary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary"
      onclick={() => (folded[title] = !folded[title])}
    >
      {title}
      <Icon name={folded[title] ? "expand" : "collapse"} class="text-foreground-darker" size="sm" />
    </Button>
  </h3>
{/snippet}
{#snippet groups(list: Group[])}
  {#each list as g (g.title)}
    <section class={group} aria-label={g.title}>
      {@render fold(g.title)}
      {#if !folded[g.title]}
        {#each g.knobs as k (k.key)}
          {@const word = k.words ? wordAt(k.words, k.min, k.max) : num}
          <div
            class="relative"
            use:hinted={k.hint}
            role="group"
            aria-label={k.label}
            onpointerenter={() => (activeKnob = k.key)}
            onpointerleave={() => (activeKnob = null)}
            onfocusin={() => (activeKnob = k.key)}
            onfocusout={() => queueMicrotask(() => (activeKnob = null))}
            ondblclick={() => changed(k.key) && resetKnob(k.key, k.label)}
          >
            <Slider
              id="cloud-{k.key}"
              size="sm"
              label={k.label}
              min={k.min}
              max={k.max}
              step={k.step}
              value={scoped[k.key]}
              format={(v) => (k.words && activeKnob === k.key ? `${word(v)} · ${num(v)}` : word(v))}
              class={track}
              oninput={(e) => setKnob(k.key, k.label, Number(e.currentTarget.value))}
            >
              {#snippet labelEnd()}
                <SkyReset
                  label={k.label}
                  changed={changed(k.key)}
                  tip={picked ? "This cloud has its own value. Click to follow the whole sky again." : "Changed. Click to reset it."}
                  onclick={() => resetKnob(k.key, k.label)}
                />
              {/snippet}
            </Slider>
          </div>
        {/each}
      {/if}
    </section>
  {/each}
{/snippet}

{#if prefs.grab && open && shown}
  <!-- Sits over the sky so clouds can be grabbed; the hand tool in the top bar turns it off to use the page. -->
  <div
    class="fixed inset-x-0 top-0 z-40 cursor-grab touch-none active:cursor-grabbing"
    style={`height: ${small ? 50 : 100}%;`}
    aria-hidden="true"
    onpointerdown={grabDown}
    onpointermove={grabMove}
    onpointerup={grabUp}
    onpointercancel={grabUp}
  ></div>
{/if}

{#if shown}
  <SkyPanel mode={{ key: "clouds", label: "Clouds" }} {modes} {onmode} bind:open wide={prefs.large && skyView.view === "settings" && tab === "paint"} {savedNote}>
    {#snippet tools()}
        {@render barTool("undo", "Undo (Ctrl+Z)", () => step(-1), { disabled: history.at < 0 })}
        {@render barTool("redo", "Redo (Shift+Ctrl+Z)", () => step(1), { disabled: history.at >= history.changes.length - 1 })}
        <span class="mx-1 h-5 w-px bg-secondary/20 max-sm:hidden" aria-hidden="true"></span>
        {@render barTool("grab", prefs.grab ? "Grabbing clouds: drag one to move it. Click to use the page instead." : "Grab clouds: drag one to move it", () => (prefs.grab = !prefs.grab), { pressed: prefs.grab })}
        {@render barTool("tag", cloudLab.tags ? "Name tags are on. Click to hide them." : "Show a name tag under each cloud in the sky", () => (cloudLab.tags = !cloudLab.tags), { pressed: cloudLab.tags })}
        {@render barTool("locked", cloudLab.paused ? "Clouds are held still. Click to let them drift." : "Hold clouds still", () => (cloudLab.paused = !cloudLab.paused), { pressed: cloudLab.paused })}
    {/snippet}

    <div class="flex shrink-0 flex-col gap-2 border-b border-secondary/15 px-6 py-4 max-sm:gap-1.5 max-sm:px-4 max-sm:py-2">
      <SegmentedPicker
        options={[{ id: -1, name: "" }, ...clouds]}
        optionKey={(o) => String(o.id)}
        selectedKey={String(id)}
        label="What to change"
        onSelect={(o) => pick(o.id)}
        class="flex gap-1 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-1 sm:max-h-60 sm:flex-col sm:overflow-y-auto sm:pr-1"
        optionClass="flex-row items-center gap-3 rounded-xl border px-2.5 py-2 max-sm:shrink-0 max-sm:p-1.5 sm:w-full"
      >
        {#snippet option(o, isSelected)}
          {#if o.id < 0}
            <SkySwatch {phase} class="w-9 shrink-0 rounded-md border aspect-[2/1]" />
            <span class="font-mono text-xs leading-none">Whole sky</span>
            <span class="ml-auto font-mono text-xs max-sm:hidden {isSelected ? '' : 'text-foreground-darker'}">{clouds.length} {clouds.length === 1 ? "cloud" : "clouds"}</span>
          {:else}
            <canvas use:thumb={o.id} width="72" height="36" class="h-[18px] w-9 shrink-0 rounded-md" style={`background: ${skyStops(phase).colors[2]};`} aria-hidden="true"></canvas>
            <span class="font-mono text-xs leading-none">{nameOf(o)}</span>
          {/if}
        {/snippet}
      </SegmentedPicker>
      <div class="flex flex-wrap items-center gap-1" role="group" aria-label={picked ? nameOf(picked) : "Whole sky"}>
        {@render action("Add a cloud", addCloud, S.count >= 40)}
        {#if picked}
          {@render action("Center", () => showCloud(picked.id))}
        {/if}
        {#if history.at >= 0}
          {@const count = history.at + 1}
          <ConfirmButton
            label={count === 1 ? "Undo 1 change" : `Undo ${count} changes`}
            confirmLabel={count === 1 ? "Undo 1 change?" : `Undo ${count} changes?`}
            confirmVariant="neutral"
            variant="outline"
            revealDelay={0}
            duration={4000}
            onConfirm={undoAll}
            class={confirmCls}
          >
            {#snippet icon()}<Icon name="undo" size="xs" />{/snippet}
            {#snippet confirmIcon()}<Icon name="confirm" size="xs" />{/snippet}
          </ConfirmButton>
        {/if}
        {#if picked && clouds.length > 1}
          <ConfirmButton
            label="Remove"
            confirmLabel="Remove this cloud?"
            confirmVariant="danger"
            variant="outline"
            revealDelay={0}
            duration={4000}
            onConfirm={remove}
            class="{confirmCls} ml-auto"
          >
            {#snippet icon()}<Icon name="delete" size="xs" />{/snippet}
            {#snippet confirmIcon()}<Icon name="confirm" size="xs" />{/snippet}
          </ConfirmButton>
        {/if}
      </div>
    </div>

      <Tabs
        {tabs}
        selected={tab}
        onSelect={(k) => {
          if (picked) cloudTab = k;
          else skyTab = k;
        }}
        label={picked ? "This cloud's settings" : "The whole sky's settings"}
        class="min-h-0 flex-1 gap-0 px-6 pt-3 max-sm:px-4 max-sm:pt-2"
        panelClass="min-h-0 flex-1 overflow-y-auto pt-6 pb-8 pl-4 -ml-4 pr-3 -mr-3 max-sm:pt-4 max-sm:pb-5"
      >
        {#snippet aside()}<SkyResetAll what={tabWhat} changed={tabChanged} onReset={resetTab} />{/snippet}
        {#snippet panel(key)}
          <div class={ui.sections}>
            {#if key === "sky"}
              <section class={group} aria-label="Weather">
                <h3 class={heading}>Weather</h3>
                <div use:hinted={"Sets the sky's colour, and the clouds' tint with it. At night no clouds show."}>
                  <p class="mb-1.5 font-mono text-xs">Time of day</p>
                  <SegmentedPicker
                    options={SKY_PHASES}
                    selectedKey={phase}
                    label="Time of day"
                    onSelect={setPhase}
                    class="flex flex-wrap gap-1"
                    optionClass="items-center gap-1.5 rounded-xl border p-2"
                  >
                    {#snippet option(p)}
                      <SkySwatch phase={p} class="w-10 rounded-md border" />
                      <span class="font-mono text-xs leading-none">{THEME_LABELS[p]}</span>
                    {/snippet}
                  </SegmentedPicker>
                </div>
                <div class="flex flex-col gap-1.5" use:hinted={"Which way the clouds drift, and how hard it blows. Today's wind is the one the sky really has."}>
                  <Slider
                    id="cloud-wind"
                    size="sm"
                    label="Wind"
                    min={-3}
                    max={3}
                    step={0.1}
                    value={cloudLab.wind ?? windFor(cloudLab.daySeed ?? today, phase).x}
                    format={(v) => (Math.abs(v) < 0.3 ? "still" : `${Math.abs(v) < 1.2 ? "light" : Math.abs(v) < 2.2 ? "fresh" : "strong"}, to the ${v < 0 ? "left" : "right"}`)}
                    class={track}
                    oninput={(e) => (cloudLab.wind = Number(e.currentTarget.value))}
                  >
                    {#snippet labelEnd()}<SkyReset label="Wind" changed={cloudLab.wind !== null} tip="Your own wind. Click to use today's wind again." onclick={() => (cloudLab.wind = null)} />{/snippet}
                  </Slider>
                </div>
                <div use:hinted={"Makes every cloud drift slower or faster than it really would."}>
                  <Slider
                    id="cloud-speed"
                    size="sm"
                    label="Speed"
                    min={0.25}
                    max={4}
                    step={0.25}
                    value={S.speed}
                    format={(v) => (v === 1 ? "real pace" : v < 1 ? `${num(1 / v)}× slower` : `${v}× faster`)}
                    class={track}
                    oninput={(e) => (S.speed = Number(e.currentTarget.value))}>
                    {#snippet labelEnd()}<SkyReset label="Speed" changed={S.speed !== CLOUD_SETTINGS.speed} onclick={() => (S.speed = CLOUD_SETTINGS.speed)} />{/snippet}
                  </Slider>
                </div>
              </section>
              <section class={group} aria-label="Clouds">
                <h3 class={heading}>Clouds</h3>
                <div use:hinted={"How many cloud designs the pool holds. The sky draws its clouds from them, each as often as its own 'How often' says. How many show at once is set per time of day, on the Sky part's Life tab."}>
                  <Slider
                    id="cloud-count"
                    size="sm"
                    label="Designs in the pool"
                    min={1}
                    max={40}
                    value={S.count}
                    class={track}
                    oninput={(e) => (S.count = Number(e.currentTarget.value))}>
                    {#snippet labelEnd()}<SkyReset label="Designs in the pool" changed={S.count !== CLOUD_SETTINGS.count} onclick={() => (S.count = CLOUD_SETTINGS.count)} />{/snippet}
                  </Slider>
                </div>
                <div use:hinted={"How strongly all clouds show against the sky."}>
                  <Slider
                    id="cloud-opacity"
                    size="sm"
                    label="Strength"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={S.opacity}
                    format={wordAt(["faint", "soft", "clear", "solid"], 0.1, 1)}
                    class={track}
                    oninput={(e) => (S.opacity = Number(e.currentTarget.value))}>
                    {#snippet labelEnd()}<SkyReset label="Strength" changed={S.opacity !== CLOUD_SETTINGS.opacity} onclick={() => (S.opacity = CLOUD_SETTINGS.opacity)} />{/snippet}
                  </Slider>
                </div>
              </section>
              <section class={group} aria-label="Layout">
                {@render fold("Layout")}
                {#if !folded.Layout}
                  <div use:hinted={"Each day places the clouds its own way. Type any number to see another day. Leave empty for today."}>
                    <Input
                      id="cloud-day"
                      name="cloud-day"
                      size="sm" class="px-3 py-2"
                      type="number"
                      label="Day number"
                      placeholder="today"
                      value={cloudLab.daySeed === null ? "" : String(cloudLab.daySeed)}
                      oninput={(e: Event) => {
                        const text = (e.currentTarget as HTMLInputElement).value;
                        cloudLab.daySeed = text === "" ? null : Number(text) || 0;
                      }}
                    />
                  </div>
                  <div use:hinted={"How many shapes the sky has to give out. With fewer shapes than clouds, some clouds look the same."}>
                    <Slider
                      id="cloud-shapes"
                      size="sm"
                      label="Different shapes"
                      min={1}
                      max={40}
                      value={S.shapes}
                      class={track}
                      oninput={(e) => (S.shapes = Number(e.currentTarget.value))}>
                      {#snippet labelEnd()}<SkyReset label="Different shapes" changed={S.shapes !== CLOUD_SETTINGS.shapes} onclick={() => (S.shapes = CLOUD_SETTINGS.shapes)} />{/snippet}
                    </Slider>
                  </div>
                  <div use:hinted={"Change it to give every cloud a new shape."}>
                    <Input
                      id="cloud-base"
                      name="cloud-base"
                      size="sm" class="px-3 py-2"
                      type="number"
                      label="Seed"
                      value={String(S.baseSeed)}
                      oninput={(e: Event) => (S.baseSeed = Number((e.currentTarget as HTMLInputElement).value) || 0)}
                    />
                  </div>
                {/if}
              </section>
            {:else if key === "cloud" && picked}
              <section class={group} aria-label="Name">
                <h3 class={heading}>Name</h3>
                <div class="flex items-end gap-1" use:hinted={"A name for this cloud. It is saved with it. The dice rolls one for you."}>
                  <Input
                    id="cloud-name"
                    name="cloud-name"
                    size="sm" class="px-3 py-2"
                    label="Name"
                    placeholder="cumulus humilis"
                    value={picked.name}
                    oninput={(e: Event) => rename((e.currentTarget as HTMLInputElement).value.trim())}
                  />
                  {@render iconAction("roll", "Roll a name", randomName)}
                </div>
              </section>
              <section class={group} aria-label="How often it shows">
                <h3 class={heading}>How often it shows</h3>
                <div use:hinted={"How often this design is drawn when a cloud drifts in, next to the other designs. At never it stays out of the sky; it still shows while you have it picked."}>
                  <Slider
                    id="cloud-rarity"
                    size="sm"
                    label="How often"
                    min={0}
                    max={3}
                    step={0.05}
                    value={picked.rarity}
                    format={() => shareOf(picked.id)}
                    class={track}
                    oninput={(e) => {
                      const rarity = Number(e.currentTarget.value);
                      change(picked.id, "Changed how often", () => (cloudEdit(picked.id).rarity = rarity));
                    }}
                  >
                    {#snippet labelEnd()}<SkyReset label="How often" changed={picked.rarity !== 1} onclick={() => resetEdit(["rarity"], "Reset how often")} />{/snippet}
                  </Slider>
                </div>
                <div class="flex flex-col gap-1.5" use:hinted={"The times of day this design may show in. Turn one off and it is never drawn then."}>
                  <span class="flex items-center gap-1 font-mono text-xs">
                    Times of day
                    <SkyReset label="Times of day" changed={picked.phases !== null} onclick={() => resetEdit(["phases"], "Reset times of day")} />
                  </span>
                  <div class="flex flex-wrap gap-1" role="group" aria-label="Times of day this design may show in">
                    {#each SKY_PHASES as p (p)}
                      {@const on = !picked.phases || picked.phases.includes(p)}
                      <Button
                        variant={on ? "secondary" : "outline"}
                        intent="compact"
                        radius="rounded"
                        class={compact}
                        aria-pressed={on}
                        onclick={() => {
                          const now = picked.phases ?? [...SKY_PHASES];
                          const next = on ? now.filter((x) => x !== p) : SKY_PHASES.filter((x) => x === p || now.includes(x));
                          change(picked.id, "Changed times of day", () => {
                            if (next.length === SKY_PHASES.length) delete cloudEdit(picked.id).phases;
                            else cloudEdit(picked.id).phases = next;
                          });
                        }}
                      >
                        {THEME_LABELS[p]}
                      </Button>
                    {/each}
                  </div>
                </div>
              </section>
              <section class={group} aria-label="Size">
                <h3 class={heading}>Size</h3>
                <div use:hinted={"How much of the sky's width this cloud takes."}>
                  <Slider
                    id="cloud-width"
                    size="sm"
                    label="Width"
                    min={10}
                    max={100}
                    value={Math.round(picked.width)}
                    format={wordAt(["small", "medium", "wide", "huge"], 10, 100)}
                    class={track}
                    oninput={(e) => {
                      const width = Number(e.currentTarget.value);
                      change(picked.id, "Changed width", () => void setWidth(picked.id, width));
                    }}
                  >
                    {#snippet labelEnd()}<SkyReset label="Width" changed={S.edits[picked.id]?.width !== undefined} onclick={() => resetEdit(["width", "top"], "Reset width")} />{/snippet}
                  </Slider>
                </div>
                <div use:hinted={"Squashes this cloud flat or stretches it tall."}>
                  <Slider
                    id="cloud-height"
                    size="sm"
                    label="Height"
                    min={0.4}
                    max={2.5}
                    step={0.05}
                    value={picked.height}
                    format={(v) => (v < 0.9 ? "squashed" : v <= 1.1 ? "as built" : v < 1.8 ? "tall" : "very tall")}
                    class={track}
                    oninput={(e) => {
                      const height = Number(e.currentTarget.value);
                      change(picked.id, "Changed height", () => (cloudEdit(picked.id).height = height));
                    }}
                  >
                    {#snippet labelEnd()}<SkyReset label="Height" changed={S.edits[picked.id]?.height !== undefined} onclick={() => resetEdit(["height"], "Reset height")} />{/snippet}
                  </Slider>
                </div>
              </section>
              <section class={group} aria-label="More like this">
                <h3 class={heading}>More like this</h3>
                <div class="flex flex-wrap items-center gap-1">
                  <span use:hinted={"Swaps this cloud for a fresh one made with the same settings. Use it when the settings are right and the cloud is not."}>
                    <Button variant="outline" intent="compact" radius="rounded" class="{compact} gap-1.5" onclick={newCloud}>
                      <Icon name="roll" size="xs" /> Roll again
                    </Button>
                  </span>
                  <span use:hinted={"Adds a second cloud to the sky that starts out just like this one."}>
                    {@render action("Copy as new", copyAsNew, S.count >= 40)}
                  </span>
                </div>
              </section>
            {:else if key === "shape"}
              <section class={group} aria-label="Templates">
                <h3 class={heading}>Templates</h3>
                <SegmentedPicker
                  options={Object.keys(presets)}
                  selectedKey={template.exact ? template.name : null}
                  label="Templates"
                  onSelect={applyTemplate}
                  class="flex flex-wrap gap-1"
                  optionClass="items-center gap-1.5 rounded-xl border p-2"
                >
                  {#snippet option(name)}
                    <span
                      class="relative flex w-14 aspect-[4/3] overflow-hidden rounded-md border border-background"
                      style={`background: linear-gradient(${skyStops(phase).colors.join(",")});`}
                      aria-hidden="true"
                    >
                      {#if shots[name]}<img src={shots[name]} alt="" class="absolute inset-0 size-full scale-125 object-contain" />{/if}
                    </span>
                    <span class="flex items-center gap-1 font-mono text-xs leading-none">
                      {name}
                      {#if template.name === name && !template.exact}<span class="size-1 rounded-full bg-primary" data-tooltip="Closest to the settings now"></span>{/if}
                      {#if S.templates[name]}<span class="size-1 rounded-full bg-secondary" data-tooltip={CLOUD_PRESETS[name] ? "Changed by you" : "Made by you"}></span>{/if}
                    </span>
                  {/snippet}
                </SegmentedPicker>
                <!-- Always there, so the tiles above and the settings below hold their place. -->
                <div class="flex items-end gap-1" use:hinted={`Keeps the shape ${picked ? "of this cloud, with its width and paint," : "every cloud shares"} as a new template. Give it a name no template has.`}>
                  <Input id="cloud-template-name" name="cloud-template-name" size="sm" class="px-3 py-2" label="New template" placeholder="a name" bind:value={templateName} />
                  {@render action("Save as new", () => saveTemplate(newName), !newName || !!presets[newName])}
                </div>
                <div class="flex flex-wrap items-center gap-1">
                  {@render ask(`Save over ${template.name}`, `Save over ${template.name}?`, () => saveTemplate(template.name), !sameAs(template.name), `Puts the shape in hand in place of the ${template.name} template, for every cloud that takes it from now on.`)}
                  {@render ask(
                    CLOUD_PRESETS[template.name] ? `Reset ${template.name}` : `Remove ${template.name}`,
                    CLOUD_PRESETS[template.name] ? `Reset ${template.name}?` : `Remove ${template.name}?`,
                    () => dropTemplate(template.name),
                    !!S.templates[template.name],
                    CLOUD_PRESETS[template.name] ? `Makes the ${template.name} template as the code has it again.` : `Takes your ${template.name} template away. Clouds made from it stay as they are.`,
                    CLOUD_PRESETS[template.name] ? "reset" : "delete",
                  )}
                </div>
              </section>
              {@render groups(BUILD)}
              <div use:hinted={"On: bumps grow upward only, so the bottom stays flat. Off: bumps grow all round."}>
                <SwitchField size="sm" label="Flat bottom" checked={scoped.flatBase >= 0.5} onchange={(v) => setKnob("flatBase", "Flat bottom", v ? 1 : 0)} />
              </div>
              {@render groups(LOOK)}
            {:else if key === "paint" && picked}
              <CloudPaint id={picked.id} {phase} {prefs} {hinted} />
            {:else if key === "motion"}
              <section class={group} aria-label="Slow reshaping">
                <h3 class={heading}>Slow reshaping</h3>
                <div use:hinted={"How much each cloud changes its shape by itself over time."}>
                  <Slider
                    id="cloud-variation"
                    size="sm"
                    label="Amount"
                    min={0}
                    max={1}
                    step={0.05}
                    value={S.variation}
                    format={(v) => (v === 0 ? "still" : wordAt(["gentle", "lively", "restless"], 0, 1)(v))}
                    class={track}
                    oninput={(e) => (S.variation = Number(e.currentTarget.value))}>
                    {#snippet labelEnd()}<SkyReset label="Amount" changed={S.variation !== CLOUD_SETTINGS.variation} onclick={() => (S.variation = CLOUD_SETTINGS.variation)} />{/snippet}
                  </Slider>
                </div>
                <div use:hinted={"How fast a cloud changes its shape and comes back. At 1× one change takes four minutes; at 2× it takes two."}>
                  <Slider
                    id="cloud-period"
                    size="sm"
                    label="Speed"
                    min={0.25}
                    max={8}
                    step={0.05}
                    value={+(CLOUD_LIVE.variationPeriod / S.variationPeriod).toFixed(2)}
                    format={(v) => `${num(v)}× · ${CLOUD_LIVE.variationPeriod / v < 90 ? `${Math.round(CLOUD_LIVE.variationPeriod / v)} s` : `${num(CLOUD_LIVE.variationPeriod / v / 60)} min`} a change`}
                    class={track}
                    oninput={(e) => (S.variationPeriod = CLOUD_LIVE.variationPeriod / Number(e.currentTarget.value))}>
                    {#snippet labelEnd()}<SkyReset label="Speed" changed={S.variationPeriod !== CLOUD_SETTINGS.variationPeriod} onclick={() => (S.variationPeriod = CLOUD_SETTINGS.variationPeriod)} />{/snippet}
                  </Slider>
                </div>
              </section>
              <section class={group} aria-label="Watch it">
                <h3 class={heading}>Watch it</h3>
                <div
                  class="flex flex-col gap-2"
                  use:hinted={"How fast you watch the clouds here: at the real pace, or sped up so the slow changes can be seen. It speeds the drift and the reshaping alike, for you alone, and goes back to real time when you close the controls. The bar shows one full change of shape."}
                >
                  <SegmentedPicker
                    options={RATES}
                    optionKey={(o) => o.key}
                    selectedKey={String(cloudLab.rate)}
                    label="How fast to watch the clouds"
                    onSelect={(o) => {
                      cloudLab.rate = Number(o.key);
                      repaint();
                    }}
                    variant="pill"
                    class="gap-1"
                    optionClass="px-3 py-1.5 font-mono text-xs"
                    option={pill}
                  />
                  <Progress value={reshaping * 100} label="How far through one change the clouds are" class="h-1.5" barClass="transition-none" />
                </div>
              </section>
            {/if}
          </div>
        {/snippet}
      </Tabs>

  </SkyPanel>
{/if}
