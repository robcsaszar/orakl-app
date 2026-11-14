<!--
  The sky part of the sky controls, shown when the URL carries `?sky`. Takes
  each time of day's look over from the code while it is mounted (`skyLab`):
  six gradient stops (colour and place), the clouds' two tints, how visible
  stars, birds and clouds are, the page's dark or light colours, the swatch
  (the small picture: a few layered things), and the clock hours. A new time of day starts as a copy of the open
  one. All of it shows on the real sky as it changes, is kept in this browser
  with an undo history, and is saved as text with the rest.
-->
<script lang="ts">
  import { SKY_PHASES } from "@orakl/shared";
  import type { SkyPhase } from "@orakl/shared";
  import { onMount } from "svelte";
  import {
    addSkyPhase,
    changeSky,
    defaultSkyColours,
    hexToHsl,
    hslToHex,
    loadSkyColours,
    SCENE_H,
    SCENE_KINDS,
    SCENE_MAX,
    SCENE_W,
    type SceneItem,
    type SceneKind,
    SKY,
    type SkyColours,
    type SkyLook,
    skyHistory,
    skyKeyAt,
    skyLab,
    skyLabel,
    showSky,
  } from "@/lib/sky-colours-lab.svelte";
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import Button from "@/lib/components/ui/Button.svelte";
  import ConfirmButton from "@/lib/components/ui/ConfirmButton.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import Input from "@/lib/components/ui/Input.svelte";
  import SegmentedPicker from "@/lib/components/ui/SegmentedPicker.svelte";
  import SkySwatch from "@/lib/components/SkySwatch.svelte";
  import Slider from "@/lib/components/ui/Slider.svelte";
  import SwitchField from "@/lib/components/ui/SwitchField.svelte";
  import Tabs from "@/lib/components/ui/Tabs.svelte";
  import SkyBarTool from "./SkyBarTool.svelte";
  import SkyLife from "./SkyLife.svelte";
  import SkyPanel from "./SkyPanel.svelte";
  import { hasLife, lifeChanged, resetLife } from "./sky-life.svelte";
  import SkyReset from "./SkyReset.svelte";
  import SkyResetAll from "./SkyResetAll.svelte";
  import { hinted, keepNow, keepSoon, skyParts, skyTab as openTab, skyTabs, ui } from "./sky-panel.svelte";

  let {
    shown = true,
    open = $bindable(true),
    modes = [],
    onmode,
  }: {
    /** False while another part of the sky controls is the one open. */
    shown?: boolean;
    open?: boolean;
    modes?: { key: string; label: string }[];
    onmode?: (key: string) => void;
  } = $props();

  const STORE = "orakl-sky-lab";
  const TABS = [
    { key: "gradient", label: "Gradient" },
    { key: "clouds", label: "Cloud tint" },
    { key: "strength", label: "Look" },
    { key: "life", label: "Life" },
    { key: "swatch", label: "Swatch" },
    { key: "use", label: "Use" },
  ];
  const SHAPES = [
    { key: "wordmark", label: "Full name" },
    { key: "mark", label: "Mark alone" },
  ] as const;
  /** Light or dark, for the page's colours and for the logo's. */
  const TONES = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
  ] as const;
  /** Where each stop sits, in plain words. */
  const STOP_NAMES = ["Top", "High", "Middle", "Low", "Near horizon", "Horizon"];
  const TINT_NAMES = ["Top of the clouds", "Underside of the clouds"];
  const DEFAULTS = defaultSkyColours();
  const HEX = /^#[0-9a-f]{6}$/;

  const C = $derived(skyLab.colours);
  const history = $derived(skyHistory.of(SKY));

  let phase = $state<SkyPhase>("noon");
  let tab = $state(openTab("sky", TABS, "gradient"));
  $effect(() => {
    skyTabs.sky = tab;
  });
  /** The stop the sliders change. */
  let stop = $state(0);
  let savedNote = $state(false);
  let copied = $state(false);
  let bar = $state<HTMLElement | null>(null);
  let picture = $state<HTMLElement | null>(null);
  /** The swatch items the sliders change, as their places in the scene; the last is the one picked last. */
  let picks = $state<number[]>([]);
  const picked = $derived(picks.at(-1) ?? -1);
  /** Picks one item, or with Shift adds it to the ones picked (or takes it out). */
  function pick(i: number, more = false) {
    if (more) picks = picks.includes(i) ? picks.filter((p) => p !== i) : [...picks, i];
    else picks = picks.length === 1 && picks[0] === i ? [] : [i];
  }
  /** Which middle lines a dragged item is held to right now. */
  let guide = $state({ x: false, y: false });
  /** How near a middle line an item snaps to it, in scene units. */
  const SNAP = 2;
  const ADDABLE = Object.keys(SCENE_KINDS) as SceneKind[];
  /** The name of an item: its kind, numbered when the swatch holds more than one of it. */
  const itemName = (i: number) => {
    const kind = look.scene[i]?.kind;
    if (!kind) return "";
    const same = look.scene.filter((o) => o.kind === kind).length;
    const nth = look.scene.slice(0, i + 1).filter((o) => o.kind === kind).length;
    return same > 1 ? `${SCENE_KINDS[kind].label} ${nth}` : SCENE_KINDS[kind].label;
  };

  /** The time of day being changed: a phase, or a custom one while it is in the sky. */
  const key = $derived(skyLab.showing && C.looks[skyLab.showing] ? skyLab.showing : phase);
  const look = $derived(C.looks[key] as SkyLook);
  const custom = $derived(C.custom[key]);
  const keys = $derived([...SKY_PHASES, ...Object.keys(C.custom)]);
  const stops = $derived(look.stops);
  const item = $derived(look.scene[picked]);
  const colour = $derived(stops.colors[stop] ?? "#000000");
  const hsl = $derived(hexToHsl(colour));
  const name = $derived(skyLabel(key));
  /** The look the code has for this time of day; a custom one has none. */
  const code = $derived(DEFAULTS.looks[key]);
  const stopChanged = (i: number) => !!code && (stops.colors[i] !== code.stops.colors[i] || stops.offsets[i] !== code.stops.offsets[i]);
  /** Which time of day the clock shows in each hour. */
  const day = $derived(Array.from({ length: 24 }, (_, h) => skyKeyAt(h)));
  const clock = (h: number) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;
  const pct = (v: number) => (v === 0 ? "hidden" : `${Math.round(v * 100)}%`);

  const compact = ui.compact;
  const track = `${ui.slider} [&_input]:[background:var(--track)]`;
  const plain = `${ui.slider} [&_input]:bg-secondary/25`;
  const hintCls = ui.hint;
  /** A named choice as one inspector row, in line with the sliders: name, then the options. */
  const choiceRow = "flex flex-col gap-1.5 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-x-4";
  const choiceLabel = "font-mono text-xs text-foreground";
  const choicePill = "px-3 py-1.5 font-mono text-xs";
  const heading = ui.heading;
  const group = ui.group;
  const confirmCls = ui.confirm;

  const gradient = (dir: string) => `linear-gradient(${dir}, ${stops.colors.map((c, i) => `${c} ${stops.offsets[i]}%`).join(", ")})`;
  const hueTrack = $derived(`linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} ${hsl[1]}% ${hsl[2]}%)`).join(",")})`);
  const satTrack = $derived(`linear-gradient(to right, hsl(${hsl[0]} 0% ${hsl[2]}%), hsl(${hsl[0]} 100% ${hsl[2]}%))`);
  const lightTrack = $derived(`linear-gradient(to right, #000, hsl(${hsl[0]} ${hsl[1]}% 50%), #fff)`);

  const label = (what: string) => `${name}, ${STOP_NAMES[stop]?.toLowerCase()}: ${what}`;

  function setColour(hex: string, what = "colour") {
    if (!HEX.test(hex)) return;
    changeSky(label(what), (c) => ((c.looks[key] as SkyLook).stops.colors[stop] = hex));
  }

  function setHsl(part: 0 | 1 | 2, value: number) {
    const next = [...hsl] as [number, number, number];
    next[part] = value;
    setColour(hslToHex(...next), ["hue", "strength", "light"][part]);
  }

  function setOffset(i: number, value: number) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    changeSky(`${name}, ${STOP_NAMES[i]?.toLowerCase()}: place`, (c) => ((c.looks[key] as SkyLook).stops.offsets[i] = v));
  }

  function setTint(i: 0 | 1, hex: string) {
    if (!HEX.test(hex)) return;
    changeSky(`${name}: ${TINT_NAMES[i]?.toLowerCase()}`, (c) => ((c.looks[key] as SkyLook).tint[i] = hex));
  }

  function resetStop() {
    if (!code) return;
    changeSky(label("reset"), (c) => {
      const l = c.looks[key] as SkyLook;
      l.stops.colors[stop] = code.stops.colors[stop] ?? "#000000";
      l.stops.offsets[stop] = code.stops.offsets[stop] ?? 0;
    });
  }

  /** The parts of a time of day's look each tab holds. */
  const TAB_KEYS: Record<string, (keyof SkyLook)[]> = {
    gradient: ["stops"],
    clouds: ["tint"],
    strength: ["theme", "logo", "logoShape", "starOpacity", "cloudOpacity", "birdOpacity"],
    swatch: ["scene"],
    use: ["hours"],
  };
  const tabName = $derived({ gradient: "the gradient", clouds: "the cloud tint", strength: "the look", swatch: "the swatch", life: "the clouds, birds and star events", use: "the hours" }[tab] ?? "");
  const tabChanged = $derived(
    tab === "life" ? hasLife(key) && lifeChanged(key) : !!code && (TAB_KEYS[tab] ?? []).some((k) => JSON.stringify(look[k]) !== JSON.stringify(code[k])),
  );
  /** Resets what the open tab holds for this time of day, as one change. */
  function resetTab() {
    if (tab === "life") {
      if (hasLife(key)) resetLife(key, name);
      return;
    }
    if (!code) return;
    changeSky(`${name}: reset all, ${tabName}`, (c) => {
      const l = c.looks[key] as SkyLook;
      for (const k of TAB_KEYS[tab] ?? []) (l[k] as unknown) = structuredClone(code[k]);
    });
  }

  /** Changes one thing about the open time of day. */
  const set = (what: string, apply: (l: SkyLook) => void) => changeSky(`${name}: ${what}`, (c) => apply(c.looks[key] as SkyLook));

  function add() {
    const id = addSkyPhase(key, `${name} copy`);
    showSky(id);
    tab = "use";
  }

  function remove() {
    const gone = key;
    showSky(custom?.base ?? "noon");
    changeSky(`Removed ${skyLabel(gone)}`, (c) => {
      delete c.looks[gone];
      delete c.custom[gone];
    });
  }

  /** Adds an item to the front of the swatch, in the upper sky, and picks it. */
  function addItem(kind: SceneKind) {
    set(`added a ${SCENE_KINDS[kind].label.toLowerCase()}`, (l) =>
      l.scene.push({
        kind,
        x: +(12 + Math.random() * 40).toFixed(1),
        y: +(10 + Math.random() * 26).toFixed(1),
        size: 1,
        turn: kind === "streak" ? 35 : 0,
        seed: Math.floor(Math.random() * 1e9),
      }),
    );
    picks = [look.scene.length - 1];
  }

  /** The items a layer button on row `i` acts on: every picked one when that row is among them, else that row alone. */
  const rowGroup = (i: number) => (picks.includes(i) && picks.length > 1 ? [...picks] : [i]);
  /** What those items are called, for a button's label and the history. */
  const groupName = (i: number) => (rowGroup(i).length > 1 ? `${rowGroup(i).length} things` : itemName(i).toLowerCase());

  function removeItem(i: number) {
    const gone = new Set(rowGroup(i));
    const what = groupName(i);
    picks = [];
    set(`removed ${what}`, (l) => (l.scene = l.scene.filter((_, n) => !gone.has(n))));
  }

  /** Whether the items of row `i` can still go one layer toward the front (1) or the back (-1). */
  function canMove(i: number, by: -1 | 1): boolean {
    const moving = new Set(rowGroup(i));
    // They can, as long as one of them has a layer that is not theirs on that side.
    return [...moving].some((n) => {
      for (let to = n + by; to >= 0 && to < look.scene.length; to += by) if (!moving.has(to)) return true;
      return false;
    });
  }

  /**
   * Moves the items of row `i` one layer toward the front (1) or the back
   * (-1). Several move as a block: each trades places with its neighbour on
   * that side, the one nearest that side first, so they keep their order.
   */
  function moveLayer(i: number, by: -1 | 1) {
    const moving = rowGroup(i).sort((a, b) => (by > 0 ? b - a : a - b));
    const what = groupName(i);
    const taken = new Set<number>();
    const landed: number[] = [];
    set(`moved ${what} ${by > 0 ? "forward" : "back"}`, (l) => {
      for (const n of moving) {
        const to = n + by;
        const [a, b] = [l.scene[n], l.scene[to]];
        // An item at the edge, or behind one of its own group that could not move, stays.
        if (!a || !b || taken.has(to)) {
          taken.add(n);
          landed.push(n);
          continue;
        }
        [l.scene[n], l.scene[to]] = [b, a];
        taken.add(to);
        landed.push(to);
      }
    });
    picks = landed;
  }

  /** Where the pointer is in the swatch, in scene units. */
  function sceneAt(e: PointerEvent): [number, number] {
    const r = (picture as HTMLElement).getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * SCENE_W, ((e.clientY - r.top) / r.height) * SCENE_H];
  }
  /** A drag in progress: where the pointer went down, and where each picked item stood then. */
  let held: { from: [number, number]; starts: Map<number, [number, number]> } | null = null;

  /** True from a press on an item until just after it: the focus that press brings must not pick the item again. */
  let pressing = false;
  function sceneDown(e: PointerEvent, i: number) {
    if (!picture) return;
    e.preventDefault();
    pressing = true;
    setTimeout(() => (pressing = false));
    if (e.shiftKey) {
      pick(i, true);
      return;
    }
    if (!picks.includes(i)) picks = [i];
    else picks = [...picks.filter((p) => p !== i), i];
    held = { from: sceneAt(e), starts: new Map(picks.map((p) => [p, [look.scene[p]?.x ?? 0, look.scene[p]?.y ?? 0]])) };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  /**
   * The picked items dragged in the swatch, all by the same amount. The one
   * under the pointer snaps to the swatch's middle, across and down, when it
   * comes near; Alt lets it pass.
   */
  function sceneMove(e: PointerEvent, i: number) {
    if (!held || !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const [px, py] = sceneAt(e);
    const [sx, sy] = held.starts.get(i) ?? [0, 0];
    let x = Math.max(0, Math.min(SCENE_W, sx + px - held.from[0]));
    let y = Math.max(0, Math.min(SCENE_H + 8, sy + py - held.from[1]));
    const snapX = !e.altKey && Math.abs(x - SCENE_W / 2) <= SNAP;
    const snapY = !e.altKey && Math.abs(y - SCENE_H / 2) <= SNAP;
    if (snapX) x = SCENE_W / 2;
    if (snapY) y = SCENE_H / 2;
    guide = { x: snapX, y: snapY };
    const dx = x - sx;
    const dy = y - sy;
    const starts = held.starts;
    set(picks.length > 1 ? `moved ${picks.length} things` : `moved ${itemName(i).toLowerCase()}`, (l) => {
      for (const [p, [ox, oy]] of starts) {
        const it = l.scene[p];
        if (it) Object.assign(it, { x: +(ox + dx).toFixed(1), y: +(oy + dy).toFixed(1) });
      }
    });
  }
  function sceneUp() {
    held = null;
    guide = { x: false, y: false };
  }
  function sceneKey(e: KeyboardEvent, i: number) {
    const by = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!by) return;
    e.preventDefault();
    const moving = picks.includes(i) ? picks : [i];
    set(moving.length > 1 ? `moved ${moving.length} things` : `moved ${itemName(i).toLowerCase()}`, (l) => {
      for (const p of moving) {
        const it = l.scene[p];
        if (it) Object.assign(it, { x: it.x + (by[0] ?? 0), y: it.y + (by[1] ?? 0) });
      }
    });
  }
  /** Changes every picked item. */
  const setPicked = (what: string, apply: (it: SceneItem) => void) =>
    set(picks.length > 1 ? `${picks.length} things: ${what}` : `${itemName(picked).toLowerCase()} ${what}`, (l) => {
      for (const p of picks) {
        const it = l.scene[p];
        if (it) apply(it);
      }
    });
  const SIZE_MIN = 0.3;
  const SIZE_MAX = 3;
  /**
   * The size slider shows the last-picked item. With several picked, each
   * grows or shrinks by the same share as that one, from the size it had.
   */
  function resize(value: number) {
    const by = value / (item?.size || 1);
    setPicked("size", (it) => (it.size = +Math.max(SIZE_MIN, Math.min(SIZE_MAX, it.size * by)).toFixed(3)));
  }
  /** The turn slider shows the last-picked item; every picked item that turns goes round by the same angle, from where it stood. */
  function turn(value: number) {
    const by = value - (item?.turn ?? 0);
    setPicked("turn", (it) => {
      if (SCENE_KINDS[it.kind].turns) it.turn = ((((it.turn + by + 180) % 360) + 360) % 360) - 180;
    });
  }
  /** Fewest picked items that can be spread out: two already have nothing between them. */
  const SPREAD_FROM = 3;
  /** Changes the place of every picked item, given all of them at once. */
  const arrange = (what: string, place: (items: SceneItem[]) => void) =>
    set(`${picks.length} things: ${what}`, (l) => place(picks.map((p) => l.scene[p]).filter((it): it is SceneItem => !!it)));
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  /** Puts the picked items on one line: the same height ("y") for a row, the same place across ("x") for a column. */
  function align(axis: "x" | "y") {
    arrange(axis === "y" ? "in a row" : "in a column", (items) => {
      const at = +mean(items.map((it) => it[axis])).toFixed(1);
      for (const it of items) it[axis] = at;
    });
  }
  /** Spaces the picked items evenly between the two that are farthest apart, across ("x") or down ("y"). */
  function spread(axis: "x" | "y") {
    arrange(axis === "x" ? "spread across" : "spread down", (items) => {
      const order = [...items].sort((a, b) => a[axis] - b[axis]);
      const first = order[0]?.[axis] ?? 0;
      const gap = ((order.at(-1)?.[axis] ?? first) - first) / (order.length - 1);
      for (const [n, it] of order.entries()) it[axis] = +(first + gap * n).toFixed(1);
    });
  }
  /** How far the group has been turned, and how far pulled apart, since it was picked. */
  let groupTurn = $state(0);
  let groupSpread = $state(1);
  $effect(() => {
    void picks.join();
    groupTurn = 0;
    groupSpread = 1;
  });
  /** Moves the picked items apart from the middle of the group, or closer to it, each by the same share. */
  function spreadOut(value: number) {
    const by = value / groupSpread;
    groupSpread = value;
    arrange("spread apart", (items) => {
      const cx = mean(items.map((it) => it.x));
      const cy = mean(items.map((it) => it.y));
      for (const it of items) {
        it.x = +(cx + (it.x - cx) * by).toFixed(2);
        it.y = +(cy + (it.y - cy) * by).toFixed(2);
      }
    });
  }
  const several = $derived(picks.length > 1);
  /** Why a group control is off, for its hint. */
  const needs = (n: number) => `Pick ${n} or more things to use this. Shift-click picks more than one.`;
  /** Turns the picked items as one body about the middle of the group; those that turn also turn with it. */
  function turnGroup(value: number) {
    const by = value - groupTurn;
    groupTurn = value;
    const a = (by * Math.PI) / 180;
    arrange("turned together", (items) => {
      const cx = mean(items.map((it) => it.x));
      const cy = mean(items.map((it) => it.y));
      for (const it of items) {
        const dx = it.x - cx;
        const dy = it.y - cy;
        it.x = +(cx + dx * Math.cos(a) - dy * Math.sin(a)).toFixed(2);
        it.y = +(cy + dx * Math.sin(a) + dy * Math.cos(a)).toFixed(2);
        if (SCENE_KINDS[it.kind].turns) it.turn = ((((it.turn + by + 180) % 360) + 360) % 360) - 180;
      }
    });
  }
  /** What the picked items are called together. */
  const pickedName = $derived(picks.length > 1 ? `${picks.length} things` : itemName(picked));
  const anyTurns = $derived(picks.some((p) => SCENE_KINDS[look.scene[p]?.kind ?? "sun"].turns));
  const anyRolls = $derived(picks.some((p) => SCENE_KINDS[look.scene[p]?.kind ?? "sun"].rolls));

  /** A stop's handle dragged along the preview bar. */
  function drag(e: PointerEvent, i: number) {
    stop = i;
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function dragMove(e: PointerEvent, i: number) {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId) || !bar) return;
    const r = bar.getBoundingClientRect();
    setOffset(i, ((e.clientX - r.left) / r.width) * 100);
  }
  function dragKey(e: KeyboardEvent, i: number) {
    const by = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (!by) return;
    e.preventDefault();
    setOffset(i, (stops.offsets[i] ?? 0) + by * (e.shiftKey ? 10 : 1));
  }

  function step(by: -1 | 1) {
    if (by < 0) skyHistory.undo(SKY);
    else skyHistory.redo(SKY);
  }

  function loadColours(data: Partial<SkyColours>) {
    loadSkyColours(data);
    skyHistory.clearAll();
  }

  function startOver() {
    showSky(phase);
    skyLab.colours = defaultSkyColours();
    skyHistory.clearAll();
  }

  /** The gradient as the code's own table, to paste into `phase-stops.constants.ts`. */
  const asCode = $derived(
    SKY_PHASES.map(
      (p) => `  ${p}: {\n    offsets: [${C.looks[p]?.stops.offsets.join(", ")}],\n    colors: [${C.looks[p]?.stops.colors.map((c) => `"${c}"`).join(", ")}],\n  },`,
    ).join("\n"),
  );

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      console.info(text);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (!shown) return;
    const typing = /^(text|number|search)$/.test((document.activeElement as HTMLInputElement | null)?.type ?? "") || document.activeElement?.tagName === "TEXTAREA";
    if (e.key === "Escape" && open && !typing) {
      open = false;
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || typing || !open) return;
    e.preventDefault();
    step(e.shiftKey ? 1 : -1);
  }

  let savedTimer: ReturnType<typeof setTimeout> | undefined;

  // Load what was kept, take over the sky's colours, and hand them back on the way out.
  onMount(() => {
    try {
      const kept = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (kept?.v === 2) loadSkyColours(kept.colours);
    } catch {
      // nothing kept, or not readable: the code's own colours
    }
    skyHistory.load();
    skyLab.active = true;
    skyParts.colours = {
      label: "Sky",
      data: () => $state.snapshot(skyLab.colours),
      load: loadColours,
      timelines: () => [
        { name: "Sky", ...skyHistory.of(SKY), goTo: (i) => skyHistory.goTo(SKY, i), forget: () => skyHistory.clear(SKY) },
      ],
      resetLabel: "Put the colours back",
      resetNote: "Puts every sky colour back as it comes, for every time of day, and forgets the colour history. The stars, clouds and birds stay.",
      reset: startOver,
      extra: gradientCode,
    };
    const unsubscribe = subscribeSkyPhase((p) => (phase = p));
    return () => {
      showSky(phase);
      keepNow();
      skyLab.active = false;
      delete document.documentElement.dataset.skyLogo;
      skyLab.logoShape = null;
      delete skyParts.colours;
      unsubscribe();
      clearTimeout(savedTimer);
    };
  });

  // The page's dark or light colours follow the open time of day's as they change.
  $effect(() => {
    if (!skyLab.active) return;
    document.documentElement.dataset.effectiveTheme = look.theme;
    document.documentElement.dataset.skyLogo = look.logo;
    skyLab.logoShape = look.logoShape;
  });

  // An item that leaves the swatch cannot stay picked.
  $effect(() => {
    if (picks.some((p) => p >= look.scene.length)) picks = picks.filter((p) => p < look.scene.length);
  });

  $effect(() => {
    const text = JSON.stringify({ v: 2, colours: C });
    if (!skyLab.active) return;
    keepSoon(STORE, text, () => {
      savedNote = true;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => (savedNote = false), 1500);
    });
  });
</script>

<svelte:window onkeydown={onKey} />

<!-- On the save page, under the start-over buttons. -->
{#snippet gradientCode()}
  <section class={group} aria-label="The gradient as code">
    <h3 class={heading}>The gradient as code</h3>
    <div class="flex" use:hinted={"Copies the gradient alone, in the shape the code keeps it in."}>
      {@render action(copied ? "Copied" : "Copy the gradient as code", () => copy(asCode))}
    </div>
  </section>
{/snippet}

{#snippet action(text: string, onclick: () => void, disabled = false)}
  <Button variant={disabled ? "disabled" : "outline"} intent="compact" radius="rounded" class={compact} {disabled} {onclick}>{text}</Button>
{/snippet}
{#snippet confirm(text: string, question: string, onConfirm: () => void, danger = false)}
  <ConfirmButton label={text} confirmLabel={question} confirmVariant={danger ? "danger" : "neutral"} variant="outline" revealDelay={0} duration={4000} {onConfirm} class={confirmCls}>
    {#snippet icon()}<Icon name="delete" size="xs" />{/snippet}
    {#snippet confirmIcon()}<Icon name="confirm" size="xs" />{/snippet}
  </ConfirmButton>
{/snippet}
{#snippet hslSlider(part: 0 | 1 | 2, text: string, max: number, trackCss: string, hint: string, format: (v: number) => string)}
  <div use:hinted={hint} style={`--track: ${trackCss};`}>
    <Slider id="sky-hsl-{part}" size="sm" label={text} min={0} {max} value={hsl[part]} {format} class={track} oninput={(e) => setHsl(part, Number(e.currentTarget.value))} />
  </div>
{/snippet}

{#if shown}
  <SkyPanel mode={{ key: "sky", label: "Sky" }} {modes} {onmode} bind:open {savedNote}>
    {#snippet tools()}
      <SkyBarTool name="undo" label="Undo (Ctrl+Z)" onclick={() => step(-1)} disabled={history.at < 0} />
      <SkyBarTool name="redo" label="Redo (Shift+Ctrl+Z)" onclick={() => step(1)} disabled={history.at >= history.changes.length - 1} />
    {/snippet}

      <div class="shrink-0 border-b border-secondary/15 px-6 py-4 max-sm:px-4 max-sm:py-1.5" use:hinted={"The time of day to change. The small pictures show your colours as you change them."}>
        <div class="flex items-stretch gap-1">
          <SegmentedPicker
            options={keys}
            selectedKey={key}
            label="Time of day"
            onSelect={showSky}
            class="flex min-w-0 flex-nowrap gap-1 overflow-x-auto"
            optionClass="items-center gap-1.5 rounded-xl border p-2 shrink-0 max-sm:p-1"
          >
            {#snippet option(p)}
              <SkySwatch phase={p} class="w-10 rounded-md border max-sm:w-7" />
              <span class="max-w-14 truncate font-mono text-xs leading-none max-sm:sr-only">{skyLabel(p)}</span>
            {/snippet}
          </SegmentedPicker>
          <span class="flex shrink-0" use:hinted={"Adds a new time of day. It starts as a copy of the open one. You name it, tune it, and say where it is used."}>
            <Button variant="outline" intent="compact" radius="rounded" class="h-full px-2" aria-label="Add a time of day" data-tooltip="Add a time of day" onclick={add}>
              <Icon name="add" size="sm" />
            </Button>
          </span>
        </div>
      </div>
      <Tabs
        tabs={TABS}
        selected={tab}
        onSelect={(k) => (tab = k)}
        label="Sky colour settings"
        class="min-h-0 flex-1 gap-0 px-6 pt-3 max-sm:px-4 max-sm:pt-2"
        panelClass="min-h-0 flex-1 overflow-y-auto pt-6 pb-8 pl-4 -ml-4 pr-3 -mr-3 max-sm:pt-4 max-sm:pb-5"
      >
        {#snippet aside()}<SkyResetAll what="{tabName} for {name.toLowerCase()}" changed={tabChanged} onReset={resetTab} />{/snippet}
        {#snippet panel(pane)}
          <div class={ui.sections}>
            {#if pane === "gradient"}
              <section class={group} aria-label="Stops">
                <h3 class={heading}>{name} sky</h3>
                <div
                  class="relative mx-3 h-12 touch-none select-none rounded-lg border border-secondary/30"
                  style={`background: ${gradient("to right")};`}
                  bind:this={bar}
                  use:hinted={"The sky from its top (left) to the horizon (right). Drag a handle to move where a colour sits. Arrow keys move it by one; with Shift, by ten."}
                >
                  {#each stops.offsets as offset, i (i)}
                    <div
                      role="slider"
                      tabindex="0"
                      aria-label="{STOP_NAMES[i]}: place in the sky"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={offset}
                      aria-valuetext="{offset}% down"
                      class="group absolute inset-y-0 -ml-3 w-6 cursor-ew-resize touch-none focus-visible:outline-hidden"
                      style={`left: ${offset}%;`}
                      onpointerdown={(e) => drag(e, i)}
                      onpointermove={(e) => dragMove(e, i)}
                      onkeydown={(e) => dragKey(e, i)}
                      onfocus={() => (stop = i)}
                    >
                      <span
                        class="absolute left-1/2 top-1/2 h-7 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white/70 group-focus-visible:ring-2 group-focus-visible:ring-secondary {stop === i
                          ? 'border-2 border-primary bg-white'
                          : 'border-black/50'}"
                      ></span>
                    </div>
                  {/each}
                </div>
                <SegmentedPicker
                  options={STOP_NAMES.map((text, i) => ({ i, text }))}
                  optionKey={(o) => String(o.i)}
                  selectedKey={String(stop)}
                  label="Which colour to change"
                  onSelect={(o) => (stop = o.i)}
                  class="grid grid-cols-6 gap-1"
                  optionClass="items-center gap-1 rounded-xl border p-1"
                >
                  {#snippet option(o)}
                    <span class="relative h-6 w-full rounded-md border border-background" style={`background: ${stops.colors[o.i]};`}>
                      {#if stopChanged(o.i)}<span class="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary" data-tooltip="Changed"></span>{/if}
                    </span>
                    <span class="font-mono text-xs leading-none">{o.i + 1}</span>
                  {/snippet}
                </SegmentedPicker>
              </section>
              <section class={group} aria-label={STOP_NAMES[stop]}>
                <!-- Always there, so the heading row keeps its height; it works once the stop is changed. -->
                <div class="flex items-center gap-1">
                  <h3 class={heading}>{stop + 1}. {STOP_NAMES[stop]}</h3>
                  <SkyBarTool name="reset" label="Reset this stop" onclick={resetStop} disabled={!stopChanged(stop)} />
                </div>
                <div class="grid grid-cols-[4rem_1fr] items-end gap-3" use:hinted={"The colour, picked by eye or typed as a hex code."}>
                  <Input id="sky-pick" name="sky-pick" type="color" size="sm" label="Colour" value={colour} class="h-9 w-full cursor-pointer p-1" oninput={(e: Event) => setColour((e.currentTarget as HTMLInputElement).value)} />
                  <Input
                    id="sky-hex"
                    name="sky-hex"
                    size="sm" class="px-3 py-2"
                    label="Hex code"
                    value={colour}
                    maxlength={7}
                    oninput={(e: Event) => {
                      const v = (e.currentTarget as HTMLInputElement).value.trim().toLowerCase();
                      setColour(v.startsWith("#") ? v : `#${v}`);
                    }}
                  />
                </div>
                {@render hslSlider(0, "Hue", 360, hueTrack, "Which colour it is, round the colour wheel.", (v) => `${v}°`)}
                {@render hslSlider(1, "Strength", 100, satTrack, "From grey to the full colour.", (v) => `${v}%`)}
                {@render hslSlider(2, "Light", 100, lightTrack, "From black, through the colour, to white.", (v) => `${v}%`)}
                <div use:hinted={"Where this colour sits between the top of the sky and the horizon."}>
                  <Slider
                    id="sky-offset"
                    size="sm"
                    label="Place in the sky"
                    min={0}
                    max={100}
                    value={stops.offsets[stop] ?? 0}
                    format={(v) => (v === 0 ? "top" : v === 100 ? "horizon" : `${v}% down`)}
                    class={plain}
                    oninput={(e) => setOffset(stop, Number(e.currentTarget.value))}
                  />
                </div>
              </section>
            {:else if pane === "clouds"}
              <section class={group} aria-label="Cloud tint">
                <h3 class={heading}>{name} clouds</h3>
                <p class={hintCls}>A cloud is lit from above. It takes one colour at its top and fades to the other on its underside.</p>
                <div class="grid grid-cols-2 gap-3">
                  {#each [0, 1] as const as i (i)}
                    <div use:hinted={i === 0 ? "The colour of the lit top of every cloud." : "The colour of the shaded underside of every cloud."}>
                      <Input
                        id="sky-tint-{i}"
                        name="sky-tint-{i}"
                        type="color"
                        size="sm"
                        label={TINT_NAMES[i]}
                        value={look.tint[i]}
                        class="h-9 w-full cursor-pointer p-1"
                        oninput={(e: Event) => setTint(i, (e.currentTarget as HTMLInputElement).value)}
                      />
                    </div>
                  {/each}
                </div>
              </section>
            {:else if pane === "strength"}
              <section class={group} aria-label="Page and logo">
                <h3 class={heading}>Page and logo</h3>
                <div class={choiceRow} use:hinted={"Text and buttons are dark on a light page and light on a dark page. Pick the one that reads well over this sky."}>
                  <span class={choiceLabel}>Page</span>
                  <SegmentedPicker options={[...TONES]} optionKey={(o) => o.key} selectedKey={look.theme} label="Page colours" onSelect={(o) => set("page colours", (l) => (l.theme = o.key))} variant="pill" class="gap-1" optionClass={choicePill}>
                    {#snippet option(o)}{o.label}{/snippet}
                  </SegmentedPicker>
                </div>
                <div class={choiceRow} use:hinted={"The logo has two sets of colours. The light one reads on a dark sky, the dark one on a bright sky."}>
                  <span class={choiceLabel}>Logo</span>
                  <SegmentedPicker options={[...TONES]} optionKey={(o) => o.key} selectedKey={look.logo} label="Logo colours" onSelect={(o) => set("logo colours", (l) => (l.logo = o.key))} variant="pill" class="gap-1" optionClass={choicePill}>
                    {#snippet option(o)}{o.label}{/snippet}
                  </SegmentedPicker>
                </div>
                <div class={choiceRow} use:hinted={"The big logo at the head of a page: the full Orakl name, or the round mark alone. The small mark in the top bar stays as it is."}>
                  <span class={choiceLabel}>Big logo</span>
                  <SegmentedPicker options={[...SHAPES]} optionKey={(o) => o.key} selectedKey={look.logoShape} label="Big logo" onSelect={(o) => set("big logo", (l) => (l.logoShape = o.key))} variant="pill" class="gap-1" optionClass={choicePill}>
                    {#snippet option(o)}{o.label}{/snippet}
                  </SegmentedPicker>
                </div>
              </section>
              <section class={group} aria-label="How much shows">
                <h3 class={heading}>How much shows</h3>
                <div use:hinted={"How clearly the stars show at this time of day."}>
                  <Slider id="sky-stars" size="sm" label="Stars" min={0} max={1} step={0.05} value={look.starOpacity} format={pct} class={plain} oninput={(e) => set("stars", (l) => (l.starOpacity = Number(e.currentTarget.value)))}>
                    {#snippet labelEnd()}<SkyReset label="Stars" changed={!!code && look.starOpacity !== code.starOpacity} onclick={() => code && set("reset stars", (l) => (l.starOpacity = code.starOpacity))} />{/snippet}
                  </Slider>
                </div>
                <div use:hinted={"How clearly the clouds show at this time of day, on top of the strength set in Clouds."}>
                  <Slider id="sky-clouds" size="sm" label="Clouds" min={0} max={1} step={0.05} value={look.cloudOpacity} format={pct} class={plain} oninput={(e) => set("clouds", (l) => (l.cloudOpacity = Number(e.currentTarget.value)))}>
                    {#snippet labelEnd()}<SkyReset label="Clouds" changed={!!code && look.cloudOpacity !== code.cloudOpacity} onclick={() => code && set("reset clouds", (l) => (l.cloudOpacity = code.cloudOpacity))} />{/snippet}
                  </Slider>
                </div>
                <div use:hinted={"How clearly the birds show at this time of day. Hidden means no birds fly."}>
                  <Slider id="sky-birds" size="sm" label="Birds" min={0} max={1} step={0.05} value={look.birdOpacity} format={pct} class={plain} oninput={(e) => set("birds", (l) => (l.birdOpacity = Number(e.currentTarget.value)))}>
                    {#snippet labelEnd()}<SkyReset label="Birds" changed={!!code && look.birdOpacity !== code.birdOpacity} onclick={() => code && set("reset birds", (l) => (l.birdOpacity = code.birdOpacity))} />{/snippet}
                  </Slider>
                </div>
              </section>
            {:else if pane === "swatch"}
              <section class={group} aria-label="Swatch">
                <div class="flex items-baseline justify-between gap-2">
                  <h3 class={heading}>{name} swatch</h3>
                  <span class="font-mono text-xs text-foreground-darker">{look.scene.length} of {SCENE_MAX}</span>
                </div>
                <p class="{hintCls} max-sm:hidden">The small picture shown where a theme is picked.</p>
                <div class="flex gap-5 max-sm:gap-3">
                  <div class="relative w-40 shrink-0 touch-none select-none self-start max-sm:w-28" bind:this={picture}
                    role="group"
                    aria-label="The swatch and the things in it"
                    onpointerdown={(e) => {
                      // A press on the swatch itself, not on a thing in it, lets go of everything picked.
                      if (!(e.target as HTMLElement).closest('[role="slider"]')) picks = [];
                    }}
                    use:hinted={"Drag a thing to move it; it snaps to the middle of the swatch, and Alt lets it pass. Shift-click picks more than one, or lets one go. Click the swatch itself to let go of all. Arrow keys nudge."}>
                    <SkySwatch phase={key} class="w-full" />
                    <!-- The middle lines, shown while a dragged thing is held to them. -->
                    {#if guide.x}<span class="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-primary" aria-hidden="true"></span>{/if}
                    {#if guide.y}<span class="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-primary" aria-hidden="true"></span>{/if}
                    {#each look.scene as it, i (i)}
                      <div
                        role="slider"
                        tabindex="0"
                        aria-label="Place of {itemName(i).toLowerCase()}"
                        aria-valuenow={Math.round(it.y)}
                        aria-valuetext="{Math.round(it.x)} across, {Math.round(it.y)} down"
                        class="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary active:cursor-grabbing {it.kind ===
                        'star'
                          ? 'size-4'
                          : 'size-7'} {picks.includes(i) ? 'border-2 border-primary' : 'border-dashed border-white/60'}"
                        style={`left: ${(it.x / SCENE_W) * 100}%; top: ${Math.min(100, (it.y / SCENE_H) * 100)}%; z-index: ${picks.includes(i) ? look.scene.length : i};`}
                        onpointerdown={(e) => sceneDown(e, i)}
                        onpointermove={(e) => sceneMove(e, i)}
                        onpointerup={sceneUp}
                        onpointercancel={sceneUp}
                        onkeydown={(e) => sceneKey(e, i)}
                        onfocus={() => {
                          // Reached with the keyboard, an item is picked; a press has already said what it wants.
                          if (!pressing && !picks.includes(i)) picks = [i];
                        }}
                      ></div>
                    {/each}
                  </div>
                  <div class="flex min-w-0 flex-1 flex-col gap-2">
                    <span class={choiceLabel}>Add</span>
                    <div class="flex flex-wrap gap-1" role="group" aria-label="Add to the swatch">
                      {#each ADDABLE as kind (kind)}
                        <span use:hinted={look.scene.length >= SCENE_MAX ? `A swatch holds ${SCENE_MAX} things at most. Remove one to add another.` : SCENE_KINDS[kind].hint}>
                          {@render action(SCENE_KINDS[kind].label, () => addItem(kind), look.scene.length >= SCENE_MAX)}
                        </span>
                      {/each}
                    </div>
                  </div>
                </div>
              </section>
              <!-- Every control stays in place and goes quiet when it has nothing to act on, so the tab does not shift as things are picked. -->
              <section class={group} aria-label="Picked">
                <div class="flex min-h-6 items-baseline justify-between gap-3">
                  <h3 class={heading}>{picks.length ? pickedName : "Nothing picked"}</h3>
                  {#if !picks.length}<span class={hintCls}>Pick a thing in the swatch or in Layers.</span>{/if}
                </div>
                <div use:hinted={!item ? "Pick a thing to change its size." : several ? "Makes every picked thing bigger or smaller by the same share, each from the size it has. The value shown is the last one picked." : "How big it is drawn."}>
                  <Slider id="sky-item-size" size="sm" label="Size" min={SIZE_MIN} max={SIZE_MAX} step={0.05} value={item?.size ?? 1} disabled={!item} format={(v) => (v === 1 ? "as it comes" : `${+v.toFixed(2)}×`)} class={plain} oninput={(e) => resize(Number(e.currentTarget.value))} />
                </div>
                <div use:hinted={!anyTurns ? "Moons, sparkles, shooting stars and birds can be turned. A sun, a star and a cloud look the same any way up." : several ? "Turns every picked thing by the same angle, each about its own middle. The value shown is the last one picked." : "Turns it about its middle."}>
                  <Slider id="sky-item-turn" size="sm" label="Turn" min={-180} max={180} step={5} value={item?.turn ?? 0} disabled={!anyTurns} format={(v) => (v === 0 ? "upright" : `${v}°`)} class={plain} oninput={(e) => turn(Number(e.currentTarget.value))} />
                </div>
                <div class={choiceRow}>
                  <span class={choiceLabel}>Arrange</span>
                  <div class="flex items-center" role="toolbar" aria-label="Arrange the picked things">
                    <span class="flex" use:hinted={several ? "Puts the picked things at the same height, side by side." : needs(2)}>
                      <SkyBarTool name="align-middle" label="Line up in a row" onclick={() => align("y")} disabled={!several} />
                    </span>
                    <span class="flex" use:hinted={several ? "Puts the picked things one above another." : needs(2)}>
                      <SkyBarTool name="align-center" label="Line up in a column" onclick={() => align("x")} disabled={!several} />
                    </span>
                    <span class="mx-1 h-5 w-px bg-secondary/20" aria-hidden="true"></span>
                    <span class="flex" use:hinted={picks.length >= SPREAD_FROM ? "Spaces the picked things evenly from the leftmost to the rightmost." : needs(SPREAD_FROM)}>
                      <SkyBarTool name="distribute-vertical" label="Space evenly across" onclick={() => spread("x")} disabled={picks.length < SPREAD_FROM} />
                    </span>
                    <span class="flex" use:hinted={picks.length >= SPREAD_FROM ? "Spaces the picked things evenly from the highest to the lowest." : needs(SPREAD_FROM)}>
                      <SkyBarTool name="distribute-horizontal" label="Space evenly down" onclick={() => spread("y")} disabled={picks.length < SPREAD_FROM} />
                    </span>
                    <span class="mx-1 h-5 w-px bg-secondary/20" aria-hidden="true"></span>
                    <span class="flex" use:hinted={anyRolls ? "Swaps each picked cloud for another shape of the same size." : "Pick a cloud to roll it another shape."}>
                      <SkyBarTool name="roll" label="Roll the cloud again" onclick={() => setPicked("rolled", (it) => { if (SCENE_KINDS[it.kind].rolls) it.seed = Math.floor(Math.random() * 1e9); })} disabled={!anyRolls} />
                    </span>
                  </div>
                </div>
                <div use:hinted={several ? "Turns the picked things as one body, about the middle of the group." : needs(2)}>
                  <Slider id="sky-group-turn" size="sm" label="Turn together" min={-180} max={180} step={5} value={groupTurn} disabled={!several} format={(v) => (v === 0 ? "as picked" : `${v}°`)} class={plain} oninput={(e) => turnGroup(Number(e.currentTarget.value))} />
                </div>
                <div use:hinted={several ? "Moves the picked things apart from the middle of the group, or closer to it." : needs(2)}>
                  <Slider id="sky-group-spread" size="sm" label="Spread" min={0.2} max={3} step={0.05} value={groupSpread} disabled={!several} format={(v) => (v === 1 ? "as picked" : v < 1 ? `${+v.toFixed(2)}×, closer` : `${+v.toFixed(2)}×, apart`)} class={plain} oninput={(e) => spreadOut(Number(e.currentTarget.value))} />
                </div>
              </section>
              <section class={group} aria-label="Layers">
                <h3 class={heading}>Layers</h3>
                {#if look.scene.length === 0}
                  <p class={hintCls}>This swatch shows the sky alone. Add a sun or a moon to start.</p>
                {:else}
                  <!-- Front first, as layer lists read: the top row covers the ones under it. -->
                  <ul class="flex flex-col gap-1" use:hinted={"What is in the swatch, the front one first. Pick a row to change that thing; Shift-click picks more. The arrows move it in front of or behind its neighbour, and the cross removes it. On a picked row they act on every picked thing."}>
                    {#each look.scene.map((it, i) => ({ it, i })).reverse() as { it, i } (i)}
                      <li class="flex items-center gap-1 rounded-xl border px-1 py-1 {picks.includes(i) ? 'border-secondary bg-secondary/15' : 'border-secondary/20'}">
                        <Button
                          unstyled
                          aria-pressed={picks.includes(i)}
                          class="min-w-0 flex-1 cursor-pointer truncate rounded-lg px-2 py-1.5 text-left font-mono text-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary"
                          onclick={(e: MouseEvent) => pick(i, e.shiftKey)}
                        >
                          {itemName(i)}
                        </Button>
                        <SkyBarTool name="collapse" label="Bring {groupName(i)} forward" onclick={() => moveLayer(i, 1)} disabled={!canMove(i, 1)} />
                        <SkyBarTool name="expand" label="Send {groupName(i)} back" onclick={() => moveLayer(i, -1)} disabled={!canMove(i, -1)} />
                        <SkyBarTool name="delete" label="Remove {groupName(i)}" onclick={() => removeItem(i)} />
                      </li>
                    {/each}
                  </ul>
                {/if}
              </section>
            {:else if pane === "life"}
              {#if hasLife(key)}
                <SkyLife phase={key} {name} />
              {:else}
                <p class={hintCls}>A time of day made here has no clouds, birds or star events of its own yet. It gets them when it is put into the code.</p>
              {/if}
            {:else if pane === "use"}
              {#if custom}
                <section class={group} aria-label="Name">
                  <h3 class={heading}>Name</h3>
                  <div use:hinted={"What this time of day is called. People see it where they pick a theme."}>
                    <Input
                      id="sky-name"
                      name="sky-name"
                      size="sm" class="px-3 py-2"
                      label="Name"
                      value={custom.label}
                      maxlength={24}
                      oninput={(e: Event) => {
                        const text = (e.currentTarget as HTMLInputElement).value.trim();
                        if (text) changeSky("Renamed a time of day", (c) => ((c.custom[key] as typeof custom).label = text));
                      }}
                    />
                  </div>
                  <p class={hintCls}>Made from {skyLabel(custom.base).toLowerCase()}. Its birds, wind and number of clouds are {skyLabel(custom.base).toLowerCase()}'s until it is in the code.</p>
                </section>
              {/if}
              <section class={group} aria-label="Clock">
                <h3 class={heading}>In the day's clock</h3>
                <div use:hinted={"On: the sky that follows the clock passes through this time of day in its hours. Off: the clock never shows it."}>
                  <SwitchField
                    size="sm"
                    label="The clock shows it"
                    checked={look.hours !== null}
                    onchange={(v) => set("in the clock", (l) => (l.hours = v ? (code?.hours ?? [12, 13]) : null))}
                  />
                </div>
                {#if look.hours}
                  <div use:hinted={"The hour it starts. A new time of day takes its hours from the one that had them."}>
                    <Slider id="sky-from" size="sm" label="From" min={0} max={23} value={look.hours[0]} format={clock} class={plain} oninput={(e) => set("start hour", (l) => { if (l.hours) l.hours[0] = Number(e.currentTarget.value); })} />
                  </div>
                  <div use:hinted={"The hour it ends. An end before the start runs over midnight."}>
                    <Slider id="sky-until" size="sm" label="Until" min={0} max={23} value={look.hours[1]} format={clock} class={plain} oninput={(e) => set("end hour", (l) => { if (l.hours) l.hours[1] = Number(e.currentTarget.value); })} />
                  </div>
                {/if}
                <div class="flex flex-col gap-1" use:hinted={"The whole day, midnight to midnight: which time of day the clock shows in each hour. An hour nothing covers shows night."}>
                  <div class="flex h-6 overflow-hidden rounded-md border border-secondary/30" role="img" aria-label="The day, hour by hour">
                    {#each day as k, h (h)}
                      <span class="flex-1 {k === key ? 'ring-1 ring-inset ring-primary' : ''}" style={`background: ${C.looks[k]?.stops.colors[2] ?? "#000"};`} data-tooltip="{clock(h)}: {skyLabel(k)}"></span>
                    {/each}
                  </div>
                  <div class="flex justify-between font-mono text-xs text-foreground-darker" aria-hidden="true"><span>12 am</span><span>6 am</span><span>12 pm</span><span>6 pm</span><span>12 am</span></div>
                </div>
              </section>
              {#if custom}
                <section class={group} aria-label="Theme picker">
                  <h3 class={heading}>In the theme picker</h3>
                  <div use:hinted={"On: people may pick this time of day as a fixed theme. With the clock and this both off, it is a special look only the app can switch to."}>
                    <SwitchField size="sm" label="People can pick it" checked={custom.inPicker} onchange={(v) => changeSky(`${name}: in the theme picker`, (c) => ((c.custom[key] as typeof custom).inPicker = v))} />
                  </div>
                  <p class={hintCls}>
                    {look.hours ? "In the clock" : "Not in the clock"}{custom.inPicker ? ", in the picker." : look.hours ? ", not in the picker." : ", not in the picker: a special look."} A new time of day shows in this browser only until it is put in the code from the saved text.
                  </p>
                  <div class="flex">{@render confirm("Remove", "Remove this time of day?", remove, true)}</div>
                </section>
              {/if}
            {/if}
          </div>
        {/snippet}
      </Tabs>
  </SkyPanel>
{/if}
