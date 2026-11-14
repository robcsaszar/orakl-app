<!--
  The shape painter of the cloud controls: one cloud's painted picture as a
  grid of cells. Painting on sky pools cloud in, painting on cloud wears it
  away; the engine soaks both into their neighbours.
-->
<script lang="ts">
  import { ui } from "./sky-panel.svelte";
  import type { SkyPhase } from "@orakl/shared";
  import { tick } from "svelte";
  import { skyStops, skyTint } from "@/lib/sky-colours-lab.svelte";
  import { PAINT_COLS, PAINT_HARDNESS, paintRows } from "@/lib/sky-clouds";
  import {
    cloudEdit,
    cloudHistory,
    cloudLab,
    cloudSnapshot,
    cloudStage,
    logCloudChange,
    redoCloud,
    undoCloud,
  } from "@/lib/sky-clouds-lab.svelte";
  import {
    type Cell,
    FAINT,
    type PaintMode,
    type PaintStrength,
    SOLID,
    discCells,
    fillRegion,
    lineCells,
    reflectCell,
    rimCells,
    setCell,
    strokeValue,
    traceMask,
  } from "@/lib/sky-clouds-paint";
  import Button from "@/lib/components/ui/Button.svelte";
  import ConfirmButton from "@/lib/components/ui/ConfirmButton.svelte";
  import FileInput from "@/lib/components/ui/FileInput.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import SegmentedPicker from "@/lib/components/ui/SegmentedPicker.svelte";
  import Slider from "@/lib/components/ui/Slider.svelte";
  import SwitchField from "@/lib/components/ui/SwitchField.svelte";

  /** The painter's own settings; the panel keeps them between visits. */
  export interface PaintPrefs {
    tool: "auto" | "add" | "erase";
    shape: "brush" | "line" | "fill";
    brush: number;
    strength: PaintStrength;
    /** 0 soft, 1 normal, 2 hard: how far the brush feathers into its neighbours. */
    hardness: number;
    faint: boolean;
    ring: boolean;
    /** Every stroke also lands across the mirror line. */
    mirror: boolean;
    /** The mirror line's angle in degrees; 90 is upright. */
    mirrorAngle: number;
    large: boolean;
    /** Clouds in the sky can be dragged; off leaves the page behind usable. */
    grab: boolean;
  }

  let {
    id,
    phase,
    prefs,
    hinted,
  }: {
    id: number;
    phase: SkyPhase;
    prefs: PaintPrefs;
    /** The panel's action that shows a setting's hint in its foot bar while the setting is in use. */
    hinted: (node: HTMLElement, text: string) => { update: (text: string) => void; destroy: () => void };
  } = $props();

  const cloud = $derived(cloudStage.clouds.find((c) => c.id === id) ?? null);
  // Read through the lab so the grid follows the settings, not the last frame's stage.
  const model = $derived.by(() => {
    void cloudLab.settings.model;
    void cloudLab.settings.edits[id]?.model;
    return cloud?.model;
  });
  const rows = $derived(model ? paintRows(model) : 20);
  const flip = $derived(cloud?.flip ?? 1);
  const sky = $derived(skyStops(phase).colors[2] ?? "");
  const white = $derived(skyTint(phase)[0]);
  const history = $derived(cloudHistory(id));
  const angle = $derived(prefs.mirror ? prefs.mirrorAngle : 90);

  let grid: HTMLCanvasElement | undefined = $state();
  let ring: HTMLElement | undefined = $state();
  let note = $state("");
  let noteTimer: ReturnType<typeof setTimeout> | undefined;
  const alpha = new Uint8Array(PAINT_COLS * 64);
  const sampler = typeof document === "undefined" ? null : document.createElement("canvas");

  function say(text: string) {
    note = text;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => (note = ""), 3500);
  }

  /** Samples the cloud as painted down to the grid, facing the way the cloud faces. */
  function draw() {
    const painter = cloudStage.painters.get(id);
    const g = grid?.getContext("2d");
    if (!painter || !g || !grid || !sampler) return;
    sampler.width = PAINT_COLS;
    sampler.height = rows;
    const sx = sampler.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    sx.setTransform(flip, 0, 0, 1, flip < 0 ? PAINT_COLS : 0, 0);
    sx.drawImage(painter.canvas, 0, 0, PAINT_COLS, rows);
    const d = sx.getImageData(0, 0, PAINT_COLS, rows).data;
    g.clearRect(0, 0, PAINT_COLS, rows);
    g.fillStyle = white;
    for (let p = 0; p < PAINT_COLS * rows; p++) {
      const a = d[p * 4 + 3] as number;
      alpha[p] = a;
      if (a > SOLID) g.globalAlpha = 1;
      else if (prefs.faint && a > FAINT) g.globalAlpha = 0.18 + (0.5 * a) / SOLID;
      else continue;
      g.fillRect(p % PAINT_COLS, Math.floor(p / PAINT_COLS), 1, 1);
    }
    g.globalAlpha = 1;
  }

  $effect(() => {
    void [id, rows, flip, prefs.faint, white];
    const onPaint = (painted: number) => {
      if (painted === id) draw();
    };
    cloudStage.painted.add(onPaint);
    tick().then(draw);
    return () => {
      cloudStage.painted.delete(onPaint);
    };
  });

  const repaint = () => tick().then(() => cloudStage.repaint(id));
  const cells = () => {
    const edit = cloudEdit(id);
    if (!edit.paint) edit.paint = {};
    return edit.paint;
  };
  /** A grid cell's key in canvas space: a mirrored cloud mirrors its columns. */
  const keyOf = (c: Cell) => `${flip < 0 ? PAINT_COLS - 1 - c.i : c.i},${c.j}`;
  const inGrid = (c: Cell) => c.i >= 0 && c.i < PAINT_COLS && c.j >= 0 && c.j < rows;
  const alphaAt = (c: Cell) => alpha[c.j * PAINT_COLS + c.i] as number;

  function cellAt(e: PointerEvent): Cell | null {
    if (!grid) return null;
    const r = grid.getBoundingClientRect();
    const c = { i: Math.floor(((e.clientX - r.left) / r.width) * PAINT_COLS), j: Math.floor(((e.clientY - r.top) / r.height) * rows) };
    return inGrid(c) ? c : null;
  }

  // One stroke: its mode, the cells it has touched (each changes once), where it began.
  let stroke: { mode: PaintMode; seen: Set<string>; before: string; last: Cell | null; lineFrom: Cell | null } | null = null;
  const modeAt = (c: Cell): PaintMode =>
    prefs.tool === "add" ? 1 : prefs.tool === "erase" ? -1 : alphaAt(c) > FAINT ? -1 : 1;

  /** One pass of the brush over a cell, or a value written outright. */
  function touch(c: Cell, mode: PaintMode, seen: Set<string>, force?: number): boolean {
    if (!inGrid(c)) return false;
    const key = keyOf(c);
    if (seen.has(key)) return false;
    seen.add(key);
    const paint = cells();
    const current = paint[key] ?? 0;
    const next = force === undefined ? strokeValue(current, alphaAt(c), mode, prefs.strength) : current * force < 0 ? 0 : force;
    if (!setCell(paint, key, next)) return false;
    const edit = cloudEdit(id);
    const hard = prefs.hardness / 2;
    if (next === 0 || hard === PAINT_HARDNESS) {
      if (edit.hardness) delete edit.hardness[key];
    } else {
      if (!edit.hardness) edit.hardness = {};
      edit.hardness[key] = hard;
    }
    return true;
  }

  function brushAt(c: Cell, mode: PaintMode, seen: Set<string>): boolean {
    let changed = false;
    for (const d of discCells(c, prefs.brush)) {
      changed = touch(d, mode, seen) || changed;
      if (prefs.mirror) changed = touch(reflectCell(d, prefs.mirrorAngle, rows), mode, seen) || changed;
    }
    return changed;
  }

  function strokeTo(c: Cell) {
    if (!stroke) return;
    let changed = false;
    for (const step of lineCells(stroke.last ?? c, c)) changed = brushAt(step, stroke.mode, stroke.seen) || changed;
    stroke.last = c;
    if (changed) repaint();
  }

  function fillFrom(c: Cell, mode: PaintMode, seen: Set<string>) {
    const region = fillRegion(alpha, rows, c);
    if (!region.cloud && region.open) {
      say("Open sky is not filled. Close the gap first, or use the brush.");
      return;
    }
    let changed = false;
    for (const cell of region.cells) changed = touch(cell, mode, seen) || changed;
    if (changed) repaint();
  }

  function previewLine(to: Cell) {
    draw();
    const g = grid?.getContext("2d");
    if (!g || !stroke?.lineFrom) return;
    g.fillStyle = stroke.mode > 0 ? white : sky;
    g.globalAlpha = 0.7;
    for (const c of lineCells(stroke.lineFrom, to)) g.fillRect(c.i, c.j, 1, 1);
    g.globalAlpha = 1;
  }

  function moveRing(e: PointerEvent) {
    const c = cellAt(e);
    if (!ring || !grid) return;
    if (!prefs.ring || !c) {
      ring.hidden = true;
      return;
    }
    const r = grid.getBoundingClientRect();
    const across = prefs.shape === "fill" ? 1 : 2 * (prefs.brush - 1) + 1;
    const mode = stroke?.mode ?? modeAt(c);
    const onCloud = alphaAt(c) > FAINT;
    // Where the stroke would change nothing, the ring takes the other colour, faint.
    const idle = mode > 0 === onCloud;
    ring.hidden = false;
    ring.style.width = `${(across * r.width) / PAINT_COLS}px`;
    ring.style.height = `${(across * r.height) / rows}px`;
    ring.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`;
    ring.style.borderColor = mode > 0 !== idle ? white : sky;
    ring.style.opacity = idle ? "0.35" : "1";
  }

  function onDown(e: PointerEvent) {
    const c = cellAt(e);
    if (!c || !grid) return;
    e.preventDefault();
    grid.setPointerCapture(e.pointerId);
    stroke = { mode: modeAt(c), seen: new Set(), before: cloudSnapshot(id), last: null, lineFrom: null };
    if (prefs.shape === "fill") {
      fillFrom(c, stroke.mode, stroke.seen);
      onUp(e);
    } else if (prefs.shape === "line") {
      stroke.lineFrom = c;
      previewLine(c);
    } else strokeTo(c);
    moveRing(e);
  }

  function onMove(e: PointerEvent) {
    moveRing(e);
    const c = cellAt(e);
    if (!stroke || !c) return;
    if (stroke.lineFrom) previewLine(c);
    else strokeTo(c);
  }

  function onUp(e: PointerEvent) {
    if (!stroke) return;
    if (stroke.lineFrom) {
      stroke.last = stroke.lineFrom;
      const to = cellAt(e) ?? stroke.lineFrom;
      stroke.lineFrom = null;
      strokeTo(to);
    }
    logCloudChange(id, stroke.mode > 0 ? "Painted cloud" : "Rubbed out cloud", stroke.before);
    stroke = null;
  }

  /** A change to the whole picture, as one step of history. */
  function act(label: string, change: (seen: Set<string>) => void) {
    const before = cloudSnapshot(id);
    change(new Set());
    const edit = cloudEdit(id);
    if (edit.paint && !Object.keys(edit.paint).length) delete edit.paint;
    if (edit.hardness && !Object.keys(edit.hardness).length) delete edit.hardness;
    logCloudChange(id, label, before);
    repaint();
  }

  const grow = () =>
    act("Grew the cloud", (seen) => {
      for (const c of rimCells(alpha, rows, false)) touch(c, 1, seen, 1);
    });
  const shrink = () =>
    act("Shrank the cloud", (seen) => {
      for (const c of rimCells(alpha, rows, true)) touch(c, -1, seen, -2);
    });
  const resetCanvas = () =>
    act("Reset the canvas", () => {
      delete cloudEdit(id).paint;
      delete cloudEdit(id).hardness;
    });
  /** Flips what is painted across the mirror line, once. */
  const flipPaint = () =>
    act("Flipped the paint", () => {
      const edit = cloudEdit(id);
      const flipKey = (key: string) => {
        const [ci = 0, j = 0] = key.split(",").map(Number);
        const shown = { i: flip < 0 ? PAINT_COLS - 1 - ci : ci, j };
        const to = reflectCell(shown, angle, rows);
        return inGrid(to) ? keyOf(to) : null;
      };
      const move = (cells: Record<string, number> | undefined) =>
        cells && Object.fromEntries(Object.entries(cells).flatMap(([key, v]) => ((k) => (k ? [[k, v]] : []))(flipKey(key))));
      edit.paint = move(edit.paint);
      edit.hardness = move(edit.hardness);
    });
  const undo = () => {
    undoCloud(id);
    repaint();
  };
  const redo = () => {
    redoCloud(id);
    repaint();
  };
  /** Shows the cloud with or without its paint. */
  const setBare = (bare: boolean) => {
    if (cloudLab.bare === bare) return;
    cloudLab.bare = bare;
    repaint();
  };

  // The mirror line turns about the middle of the canvas; its handle is dragged.
  let turning = false;
  function turnMirror(e: PointerEvent) {
    if (!turning || !grid) return;
    const r = grid.getBoundingClientRect();
    let degrees = (Math.atan2(-(e.clientY - (r.top + r.height / 2)), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    if (e.shiftKey) degrees = Math.round(degrees / 15) * 15;
    prefs.mirrorAngle = ((Math.round(degrees) % 180) + 180) % 180;
  }

  function trace(files: FileList) {
    const file = files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = PAINT_COLS;
      c.height = rows;
      const x = c.getContext("2d") as CanvasRenderingContext2D;
      const k = Math.min(PAINT_COLS / img.width, rows / img.height);
      x.drawImage(img, (PAINT_COLS - img.width * k) / 2, (rows - img.height * k) / 2, img.width * k, img.height * k);
      URL.revokeObjectURL(url);
      const mask = traceMask(x.getImageData(0, 0, PAINT_COLS, rows).data);
      act("Copied a shape from a picture", (seen) => {
        mask.forEach((isCloud, p) => {
          const cell = { i: p % PAINT_COLS, j: Math.floor(p / PAINT_COLS) };
          if (isCloud && alphaAt(cell) <= SOLID) touch(cell, 1, seen, 1);
          else if (!isCloud && alphaAt(cell) > FAINT) touch(cell, -1, seen, -2);
        });
      });
      say("Copied the picture's shape. Undo brings the earlier shape back.");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      say("That file is not a picture.");
    };
    img.src = url;
  }

  const TOOLS = [
    { key: "auto", label: "Smart", icon: "tabler/wand", hint: "Adds cloud where you start on sky, rubs it out where you start on cloud." },
    { key: "add", label: "Add", icon: "tabler/plus", hint: "Adds cloud wherever you paint." },
    { key: "erase", label: "Rub out", icon: "tabler/eraser", hint: "Takes cloud away wherever you paint." },
  ] as const;
  const SHAPES = [
    { key: "brush", label: "Brush", icon: "tabler/brush", hint: "Paints as you drag." },
    { key: "line", label: "Line", icon: "tabler/line", hint: "Drag to draw one straight line." },
    { key: "fill", label: "Fill", icon: "tabler/bucket-droplet", hint: "Click to change one whole patch." },
  ] as const;
  const SIZE = ["", "tiny", "small", "medium", "large", "huge"];
  const STRENGTH = ["", "light", "normal", "full"];
  const HARDNESS = ["soft", "normal", "hard"];
  const mode = $derived(TOOLS.find((t) => t.key === prefs.tool) ?? TOOLS[0]);
  const shape = $derived(SHAPES.find((t) => t.key === prefs.shape) ?? SHAPES[0]);
  const small = "px-2.5 py-1.5 font-mono text-xs font-normal";
  const iconBtn = "p-1.5";
  const heading = ui.heading;
  const hintCls = ui.hint;
  const plain = `${ui.slider} [&_input]:bg-secondary/25`;
</script>

{#snippet tool(o: { label: string; icon: string; hint: string })}
  <span data-tooltip="{o.label}. {o.hint}" class="flex"><Icon name={o.icon} class="size-4" /><span class="sr-only">{o.label}</span></span>
{/snippet}
{#snippet action(label: string, onclick: () => void, disabled = false)}
  <Button variant={disabled ? "disabled" : "outline"} intent="compact" radius="rounded" class={small} {disabled} {onclick}>{label}</Button>
{/snippet}
{#snippet iconAction(name: string, label: string, onclick: () => void, disabled = false)}
  <Button variant={disabled ? "disabled" : "outline"} intent="compact" radius="rounded" class={iconBtn} aria-label={label} data-tooltip={label} {disabled} {onclick}>
    <Icon {name} class="size-3.5" />
  </Button>
{/snippet}

<div class="flex flex-col gap-6">
  <section class="flex flex-col gap-2" aria-labelledby="paint-canvas">
    <h3 id="paint-canvas" class={heading}>Canvas</h3>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <SegmentedPicker
        options={SHAPES}
        optionKey={(o) => o.key}
        selectedKey={prefs.shape}
        label="How the brush draws"
        onSelect={(o) => (prefs.shape = o.key)}
        variant="pill"
        class="gap-0.5"
        optionClass="rounded-lg p-1.5"
        option={tool}
      />
      <SegmentedPicker
        options={TOOLS}
        optionKey={(o) => o.key}
        selectedKey={prefs.tool}
        label="What the brush does"
        onSelect={(o) => (prefs.tool = o.key)}
        variant="pill"
        class="gap-0.5"
        optionClass="rounded-lg p-1.5"
        option={tool}
      />
      <p class="min-w-0 flex-1 {hintCls}"><span class="text-foreground">{shape.label}, {mode.label.toLowerCase()}.</span> {shape.hint} {mode.hint}</p>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5" role="toolbar" aria-label="Canvas tools">
      <div class="flex gap-1">
        {@render iconAction("tabler/arrow-back-up", "Undo (Ctrl+Z)", undo, history.at < 0)}
        {@render iconAction("tabler/arrow-forward-up", "Redo (Shift+Ctrl+Z)", redo, history.at >= history.changes.length - 1)}
      </div>
      <div class="flex gap-1">
        {@render action("Grow", grow)}
        {@render action("Shrink", shrink)}
      </div>
      <div class="flex gap-1">
        <Button
          variant="outline"
          intent="compact"
          radius="rounded"
          behavior="toggle"
          data-state={prefs.mirror ? "on" : "off"}
          aria-pressed={prefs.mirror}
          class={small}
          onclick={() => (prefs.mirror = !prefs.mirror)}
        >
          Mirror
        </Button>
        {@render action("Flip", flipPaint)}
      </div>
      <ConfirmButton
        label="Reset canvas"
        confirmLabel="Reset the canvas?"
        confirmVariant="neutral"
        variant="outline"
        revealDelay={0}
        duration={4000}
        onConfirm={resetCanvas}
        class="ml-auto gap-1 rounded-lg px-2.5 py-1.5 font-mono text-xs font-normal"
      >
        {#snippet icon()}<Icon name="tabler/x" class="size-3.5" />{/snippet}
        {#snippet confirmIcon()}<Icon name="tabler/check" class="size-3.5" />{/snippet}
      </ConfirmButton>
    </div>
    <div class="relative overflow-hidden rounded-lg border-2 border-secondary/25">
      <canvas
        bind:this={grid}
        width={PAINT_COLS}
        height={rows}
        class="block w-full cursor-crosshair touch-none [image-rendering:pixelated]"
        style={`aspect-ratio: ${PAINT_COLS} / ${rows}; background: ${sky};`}
        aria-label="Cloud shape, as a grid of squares to paint on"
        onpointerdown={onDown}
        onpointermove={onMove}
        onpointerup={onUp}
        onpointercancel={onUp}
        onpointerleave={() => {
          if (ring && !stroke) ring.hidden = true;
        }}
      ></canvas>
      <div bind:this={ring} hidden class="pointer-events-none absolute left-0 top-0 rounded-full border"></div>
      {#if prefs.mirror}
        <!-- The mirror line, turned about the middle; its end is the handle. -->
        <div
          class="pointer-events-none absolute left-1/2 top-1/2 w-[200%] -translate-x-1/2"
          style={`rotate: ${-prefs.mirrorAngle}deg;`}
        >
          <div class="border-t border-dotted border-foreground/50"></div>
          <button
            type="button"
            aria-label="Turn the mirror line. Hold Shift for steps of 15 degrees."
            data-tooltip="Drag to turn the mirror. Hold Shift for steps."
            class="pointer-events-auto absolute left-[calc(50%+3rem)] top-0 size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border border-foreground/70 bg-background/70 active:cursor-grabbing"
            onpointerdown={(e) => {
              turning = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onpointermove={turnMirror}
            onpointerup={() => (turning = false)}
            onpointercancel={() => (turning = false)}
            onkeydown={(e) => {
              const step = e.key === "ArrowLeft" ? 15 : e.key === "ArrowRight" ? -15 : 0;
              if (step) prefs.mirrorAngle = (((prefs.mirrorAngle + step) % 180) + 180) % 180;
            }}
          ></button>
        </div>
      {/if}
      <Button
        unstyled
        aria-label="Hold to compare with the cloud before your paint"
        data-tooltip="Hold to compare: the cloud before your paint"
        class="absolute right-1.5 top-1.5 cursor-pointer rounded-lg bg-background/60 p-1.5 text-foreground hover:bg-background/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary"
        onpointerdown={() => setBare(true)}
        onpointerup={() => setBare(false)}
        onpointerleave={() => setBare(false)}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === " " || e.key === "Enter") setBare(true);
        }}
        onkeyup={() => setBare(false)}
      >
        <Icon name="tabler/layers-difference" class="size-4" />
      </Button>
    </div>
    <p class="min-h-4 {hintCls}" role="status">
      {note || (prefs.mirror ? "Mirror is on: what you paint also lands across the dotted line. Drag the dot to turn the line." : "")}
    </p>
  </section>

  <section class="flex flex-col gap-4" aria-labelledby="paint-brush">
    <h3 id="paint-brush" class={heading}>Brush</h3>
    <div use:hinted={"How much one touch of the brush covers."}>
      <Slider
        id="cloud-brush"
        size="sm"
        class={plain}
        label="Size"
        min={1}
        max={5}
        value={prefs.brush}
        format={(v) => SIZE[v] ?? ""}
        oninput={(e) => (prefs.brush = Number(e.currentTarget.value))}
      />
    </div>
    <div use:hinted={"Light changes a little. Full changes it all at once. Going over a spot again does more."}>
      <Slider
        id="cloud-strength"
        size="sm"
        class={plain}
        label="Strength"
        min={1}
        max={3}
        value={prefs.strength}
        format={(v) => STRENGTH[v] ?? ""}
        oninput={(e) => (prefs.strength = Number(e.currentTarget.value) as PaintStrength)}
      />
    </div>
    <div use:hinted={"Soft blends far into the cloud around it. Hard keeps a clear edge."}>
      <Slider
        id="cloud-hardness"
        size="sm"
        class={plain}
        label="Hardness"
        min={0}
        max={2}
        value={prefs.hardness}
        format={(v) => HARDNESS[v] ?? ""}
        oninput={(e) => (prefs.hardness = Number(e.currentTarget.value))}
      />
    </div>
  </section>

  <section class="flex flex-col gap-2" aria-labelledby="paint-picture">
    <h3 id="paint-picture" class={heading}>From a picture</h3>
    <FileInput id="cloud-trace" label="Choose a picture" accept="image/*" onfiles={trace} class="gap-3 px-3 py-2 font-sans">
      <span class={hintCls}>Its outline becomes this cloud's shape.</span>
    </FileInput>
  </section>

  <section class="flex flex-col gap-3" aria-labelledby="paint-view">
    <h3 id="paint-view" class={heading}>View</h3>
    <div use:hinted={"Also show thin, see-through cloud in the grid."}><SwitchField size="sm" label="Show faint cloud" checked={prefs.faint} onchange={(v) => (prefs.faint = v)} /></div>
    <div use:hinted={"A circle under the pointer shows how far the brush reaches."}><SwitchField size="sm" label="Brush ring" checked={prefs.ring} onchange={(v) => (prefs.ring = v)} /></div>
    <div use:hinted={"Makes this panel wide, for fine work."}><SwitchField size="sm" label="Big grid" checked={prefs.large} onchange={(v) => (prefs.large = v)} /></div>
  </section>
</div>
