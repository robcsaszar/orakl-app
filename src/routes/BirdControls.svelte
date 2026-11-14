<!--
  The birds half of the sky controls, shown when the URL carries `?birds`.
  Takes the flocks' tables over from the code while it is mounted (`birdLab`)
  and drives the mounted sky (`current.runner`): send a flock by hand, see
  what is up and what the schedule sends next, and change every number of the
  schedule, the flight and the look per time of day. Everything is kept in
  this browser, with an undo history, and is saved as text with the clouds.
-->
<script lang="ts">
  import { SKY_PHASES, THEME_LABELS } from "@orakl/shared";
  import type { SkyPhase } from "@orakl/shared";
  import { onMount } from "svelte";
  import { current } from "@/lib/birds/current.svelte";
  import { type LiveEvent, type NextEvent, RANGES } from "@/lib/birds/engine";
  import type { EventKind, EventSpec } from "@/lib/birds/event";
  import { BIRDS, birdHistory, birdLab, birdValue, setBirdValue } from "@/lib/birds/lab.svelte";
  import { MODIFIERS, type ModifierId } from "@/lib/birds/modifiers";
  import type { Rgb } from "@/lib/birds/render";
  import { defaultBirdSettings, readBirdSettings, type SavedBirdSettings } from "@/lib/birds/settings";
  import { showSky } from "@/lib/sky-colours-lab.svelte";
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import Button from "@/lib/components/ui/Button.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import Input from "@/lib/components/ui/Input.svelte";
  import SegmentedPicker from "@/lib/components/ui/SegmentedPicker.svelte";
  import Select from "@/lib/components/ui/Select.svelte";
  import SkySwatch from "@/lib/components/SkySwatch.svelte";
  import Slider from "@/lib/components/ui/Slider.svelte";
  import SwitchField from "@/lib/components/ui/SwitchField.svelte";
  import Tabs from "@/lib/components/ui/Tabs.svelte";
  import SkyBarTool from "./SkyBarTool.svelte";
  import SkyPanel from "./SkyPanel.svelte";
  import SkyReset from "./SkyReset.svelte";
  import SkyResetAll from "./SkyResetAll.svelte";
  import { hinted, keepNow, keepSoon, skyFolds, skyParts, skyTab, skyTabs, ui } from "./sky-panel.svelte";

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

  const STORE = "orakl-bird-lab";
  /** The kinds of flock, in plain words. */
  const KIND: Record<EventKind, string> = { skein: "Geese", murmuration: "Starlings", soar: "Gulls", raptor: "Hawk" };
  /** The engine's own word for a kind, shown small beside the plain one where the two differ. */
  const ENGINE: Record<EventKind, string> = { skein: "skein", murmuration: "murmuration", soar: "", raptor: "raptor" };
  const KINDS = (Object.keys(KIND) as EventKind[]).map((key) => ({ key, label: KIND[key], sub: ENGINE[key] }));
  const TABS = [
    { key: "stage", label: "Stage" },
    { key: "schedule", label: "Schedule" },
    { key: "flight", label: "Flight" },
    { key: "look", label: "Look" },
  ];
  const RATES = [0.25, 0.5, 1, 2, 4].map((r) => ({ key: String(r), label: r < 1 ? `1/${1 / r}×` : `${r}×` }));
  const DEFAULTS = defaultBirdSettings();

  const S = $derived(birdLab.settings);
  const history = $derived(birdHistory.of(BIRDS));

  let phase = $state<SkyPhase>("noon");
  let tab = $state(skyTab("birds", TABS, "stage"));
  $effect(() => {
    skyTabs.birds = tab;
  });
  /** What "Send" sends, and how the sky runs; kept between visits. */
  const stage = $state({
    kind: "skein" as EventKind,
    count: 21,
    depth: 60,
    /** "roll" lets the time of day pick, "none" sends it plain, else that one twist. */
    twist: "roll" as "roll" | "none" | ModifierId,
    keep: false,
    tags: false,
    auto: true,
    speed: 1,
  });
  let paused = $state(false);
  let sent = $state(false);
  const folded = skyFolds("birds");
  let live = $state<LiveEvent[]>([]);
  let next = $state<NextEvent[]>([]);
  let stats = $state({ events: 0, birds: 0, drawn: 0, ms: 0 });
  let savedNote = $state(false);
  let copied = $state(false);

  const scenario = $derived(S.scenarios[phase]);
  const when = $derived(THEME_LABELS[phase].toLowerCase());
  const twistsFor = (kind: EventKind) => MODIFIERS.filter((m) => m.kind === kind);
  /** The times of day a twist comes at, as a sentence. */
  function twistTimes(m: (typeof MODIFIERS)[number]): string {
    const at = SKY_PHASES.filter((p) => (m.weights[p] ?? 0) > 0).map((p) => THEME_LABELS[p].toLowerCase());
    if (at.length === 0) return "It comes at no time of day.";
    const last = at.pop();
    return `It comes at ${at.length ? `${at.join(", ")} and ${last}` : last}.`;
  }
  const weightSum = $derived(scenario.events.reduce((sum, e) => sum + e.weight, 0));

  const compact = ui.compact;
  const track = `${ui.slider} [&_input]:bg-secondary/25`;
  const hintCls = ui.hint;
  const heading = ui.heading;
  const group = ui.group;
  const row = "flex items-center gap-3 rounded-xl border border-secondary/20 px-3 py-2.5";

  const num = (v: number) => String(+v.toFixed(2));
  const secs = (v: number) => (v < 90 ? `${num(v)} s` : `${num(v / 60)} min`);
  const metres = (v: number) => `${v} m`;
  const times = (v: number) => (v === 1 ? "as planned" : `${num(v)}×`);
  const perHour = (v: number) => (v <= 0 ? "never" : v < 1 ? `one in ${num(1 / v)} h` : `${num(v)} an hour`);
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const thisMonth = new Date().getMonth();
  const down = (v: number) => `${v < 0.2 ? "top" : v < 0.45 ? "upper" : v < 0.65 ? "middle" : "low"} · ${Math.round(v * 100)}%`;
  const hex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
  const rgb = (h: string): Rgb => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as Rgb;

  const changed = (path: (string | number)[]) => JSON.stringify(birdValue(S, path)) !== JSON.stringify(birdValue(DEFAULTS, path));
  const reset = (path: (string | number)[], label: string) => setBirdValue(path, `Reset ${label.toLowerCase()}`, structuredClone(birdValue(DEFAULTS, path) ?? 1));

  /** Sets one end of a [low, high] pair and moves the other end along when they would cross. */
  function setEnd(path: (string | number)[], end: 0 | 1, label: string, value: number, fallback: [number, number]) {
    const pair = [...((birdValue(S, path) as [number, number] | undefined) ?? fallback)] as [number, number];
    pair[end] = value;
    if (pair[0] > pair[1]) pair[1 - end] = value;
    setBirdValue(path, label, pair);
  }

  /** The settings each tab holds, as paths; the stage holds none. */
  const tabPaths = $derived<Record<string, (string | number)[][]>>({
    schedule: [["scenarios", phase, "perHour"], ["scenarios", phase, "days"], ["scenarios", phase, "first"], ["scenarios", phase, "events"]],
    flight: [["scenarios", phase, "tune"], ["limits"], ["seasons"], ["twistShare"], ["twoTwists"], ["twists"]],
    look: [["palettes", phase], ["scale"]],
  });
  const tabName = $derived(TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? "");
  const tabChanged = $derived((tabPaths[tab] ?? []).some((path) => changed(path)));
  /** Resets every setting on the open tab, as one change. */
  function resetTab() {
    for (const path of tabPaths[tab] ?? [])
      if (changed(path)) setBirdValue(path, `Reset all: ${tabName}`, structuredClone(birdValue(DEFAULTS, path)));
  }

  const setPhase = (p: SkyPhase) => showSky(p);

  let sentAt = 0;
  /** A kind's own bounds: how many birds, how far. */
  const limitOf = (kind: EventKind) => S.limits[kind] ?? RANGES[kind];

  function send() {
    const r = limitOf(stage.kind);
    const count = Math.min(r.count[1], Math.max(r.count[0], stage.count));
    const depth = Math.min(r.depth[1], Math.max(r.depth[0], stage.depth));
    const forced =
      stage.twist === "roll" ? undefined
      : stage.twist !== "none" && MODIFIERS.some((m) => m.id === stage.twist && m.kind === stage.kind) ? [stage.twist]
      : [];
    current.runner?.spawn({ kind: stage.kind, weight: 1, count: [count, count], depth: [depth, depth], exact: true }, forced);
    sent = true;
    sentAt = Date.now();
  }

  function again() {
    current.runner?.replay();
    sentAt = Date.now();
  }

  function pickKind(kind: EventKind) {
    stage.kind = kind;
    const r = limitOf(kind);
    stage.count = Math.min(r.count[1], Math.max(r.count[0], stage.count));
    stage.depth = Math.min(r.depth[1], Math.max(r.depth[0], stage.depth));
    if (stage.twist !== "roll" && stage.twist !== "none" && !twistsFor(kind).some((m) => m.id === stage.twist)) stage.twist = "roll";
  }

  function addKind(kind: EventKind) {
    const spec: EventSpec = { kind, weight: 1 };
    const now = $state.snapshot(scenario);
    setBirdValue(["scenarios", phase], `${THEME_LABELS[phase]}: added ${KIND[kind].toLowerCase()}`, {
      ...now,
      // A time of day with no flocks yet takes noon's rate, so the first kind comes at all.
      ...(now.perHour <= 0 ? { perHour: DEFAULTS.scenarios.noon.perHour, first: DEFAULTS.scenarios.noon.first } : {}),
      events: [...now.events, spec],
    });
  }

  function removeKind(index: number) {
    const kind = scenario.events[index]?.kind;
    if (!kind) return;
    setBirdValue(
      ["scenarios", phase, "events"],
      `${THEME_LABELS[phase]}: removed ${KIND[kind].toLowerCase()}`,
      $state.snapshot(scenario.events).filter((_, i) => i !== index),
    );
  }

  /** A flock's name in plain words, with its twists. */
  const nameOf = (e: { kind: EventKind; label: string }) => KIND[e.kind] + (e.label.includes(" · ") ? `, ${e.label.split(" · ")[1]}` : "");

  function step(by: -1 | 1) {
    if (by < 0) birdHistory.undo(BIRDS);
    else birdHistory.redo(BIRDS);
  }

  function loadBirds(data: SavedBirdSettings) {
    if (!data.scenarios || !data.palettes) throw new Error("not saved birds");
    birdLab.settings = readBirdSettings(data);
    birdHistory.clearAll();
  }

  function startOver() {
    birdLab.settings = defaultBirdSettings();
    birdHistory.clearAll();
  }

  /** Copies what is in the sky at this moment, with the day's seed. */
  async function copyMoment() {
    const text = JSON.stringify(await current.runner?.snapshot(), null, 2);
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

  /** How often the sky's numbers are asked for, ms: for the lists, and for name tags that follow the flocks. */
  const LISTS_EVERY = 250;
  const TAGS_EVERY = 50;
  /** The numbers are read only while someone can see them, or a flock is being kept coming. */
  const watching = $derived((shown && open) || stage.keep);
  const tagged = $derived(stage.tags && shown && open);

  function read() {
    const s = current.runner?.stats;
    if (!s) return;
    live = s.live;
    next = s.next;
    stats = { events: s.events, birds: s.birds, drawn: s.drawn, ms: s.ms };
  }

  // Name tags follow the flocks, so they read every frame while they show.
  $effect(() => {
    if (!tagged) return;
    let frame = requestAnimationFrame(function tick() {
      frame = requestAnimationFrame(tick);
      read();
    });
    return () => cancelAnimationFrame(frame);
  });

  // Load what was kept, take over the flocks, and hand them back on the way out.
  onMount(() => {
    try {
      const kept = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (kept?.v === 1) {
        birdLab.settings = readBirdSettings(kept.settings);
        Object.assign(stage, kept.stage);
      }
    } catch {
      // nothing kept, or not readable: the code's own flocks
    }
    birdHistory.load();
    birdLab.active = true;
    skyParts.birds = {
      label: "Birds",
      data: () => $state.snapshot(birdLab.settings),
      load: loadBirds,
      timelines: () => [
        { name: "Birds", ...birdHistory.of(BIRDS), goTo: (i) => birdHistory.goTo(BIRDS, i), forget: () => birdHistory.clear(BIRDS) },
      ],
      resetLabel: "Put the birds back",
      resetNote: "Puts every bird setting back as it comes, and forgets all bird history. The sky, stars and clouds stay.",
      reset: startOver,
      extra: birdExtra,
    };
    const unsubscribe = subscribeSkyPhase((p) => (phase = p));

    const timer = setInterval(() => {
      if (!watching) return;
      read();
      // An empty sky with "keep one coming" on gets the staged flock again.
      if (stage.keep && !paused && live.length === 0 && Date.now() - sentAt > 1500) {
        if (sent) again();
        else send();
      }
    }, 250);
    return () => {
      keepNow();
      birdLab.active = false;
      delete skyParts.birds;
      const r = current.runner;
      if (r) {
        r.setPaused(false);
        r.setAuto(true);
        r.speed = 1;
        r.watch(0);
      }
      unsubscribe();
      clearInterval(timer);
      clearTimeout(savedTimer);
    };
  });

  // The sky's own switches follow the panel's, also on a sky that mounts later.
  $effect(() => {
    const r = current.runner;
    if (!r) return;
    r.setAuto(stage.auto);
    r.speed = stage.speed;
    r.setPaused(paused);
    r.watch(watching ? (tagged ? TAGS_EVERY : LISTS_EVERY) : 0);
  });

  $effect(() => {
    const text = JSON.stringify({ v: 1, settings: S, stage });
    if (!birdLab.active) return;
    keepSoon(STORE, text, () => {
      savedNote = true;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => (savedNote = false), 1500);
    });
  });
</script>

<svelte:window onkeydown={onKey} />

{#snippet pill(o: { key: string; label: string })}{o.label}{/snippet}
<!-- On the save page, under the start-over buttons. -->
{#snippet birdExtra()}
  <section class={group} aria-label="This moment">
    <h3 class={heading}>This moment</h3>
    <div class="flex" use:hinted={"Copies what is in the sky at this moment, with the day's seed, so the same sighting can be made again."}>
      {@render action(copied ? "Copied" : "Copy this moment", copyMoment)}
    </div>
  </section>
  <section class={group} aria-label="How hard the device works">
    <h3 class={heading}>How hard the device works</h3>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
      <dt class="text-foreground-darker">Time per frame</dt>
      <dd>{stats.ms.toFixed(1)} ms</dd>
      <dt class="text-foreground-darker">Flocks in the sky</dt>
      <dd>{stats.events}</dd>
      <dt class="text-foreground-darker">Birds in the sky</dt>
      <dd>{stats.birds}</dd>
      <dt class="text-foreground-darker">Birds drawn</dt>
      <dd>{stats.drawn}</dd>
    </dl>
  </section>
{/snippet}

{#snippet action(label: string, onclick: () => void, disabled = false)}
  <Button variant={disabled ? "disabled" : "outline"} intent="compact" radius="rounded" class={compact} {disabled} {onclick}>{label}</Button>
{/snippet}
{#snippet kindPill(o: { label: string; sub: string })}{o.label}{#if o.sub}<span class="ml-1 text-xs opacity-60">{o.sub}</span>{/if}{/snippet}
{#snippet fold(title: string, sub = "")}
  <h3 class={heading}>
    <Button
      unstyled
      aria-expanded={!folded[title]}
      class="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center justify-between rounded-lg px-1 py-0.5 text-left hover:bg-secondary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary"
      onclick={() => (folded[title] = !folded[title])}
    >
      <span>{title}{#if sub}<span class="ml-1.5 font-mono text-xs text-foreground-darker">{sub}</span>{/if}</span>
      <Icon name={folded[title] ? "expand" : "collapse"} class="text-foreground-darker" size="sm" />
    </Button>
  </h3>
{/snippet}
<!-- One number of the settings as a slider. -->
{#snippet knob(path: (string | number)[], label: string, hint: string, o: { min: number; max: number; step?: number; format?: (v: number) => string; note?: string })}
  <div use:hinted={hint} role="group" aria-label={label} ondblclick={() => changed(path) && reset(path, label)}>
    <Slider
      id="bird-{path.join('-')}"
      size="sm"
      {label}
      min={o.min}
      max={o.max}
      step={o.step ?? 1}
      value={(birdValue(S, path) as number | undefined) ?? 1}
      format={o.format ?? num}
      class={track}
      oninput={(e) => setBirdValue(path, `${o.note ?? ""}${o.note ? label.toLowerCase() : label}`, Number(e.currentTarget.value))}
    >
      {#snippet labelEnd()}<SkyReset {label} changed={changed(path)} onclick={() => reset(path, label)} />{/snippet}
    </Slider>
  </div>
{/snippet}
<!-- The two ends of a [low, high] range as two sliders. -->
{#snippet range(path: (string | number)[], labels: [string, string], hint: string, o: { min: number; max: number; step?: number; format?: (v: number) => string; fallback?: [number, number] })}
  {@const pair = (birdValue(S, path) as [number, number] | undefined) ?? o.fallback ?? [o.min, o.max]}
  {@const start = (birdValue(DEFAULTS, path) as [number, number] | undefined) ?? o.fallback ?? [o.min, o.max]}
  <div class="flex flex-col gap-4" use:hinted={hint}>
    {#each [0, 1] as const as end (end)}
      <Slider
        id="bird-{path.join('-')}-{end}"
        size="sm"
        label={labels[end]}
        min={o.min}
        max={o.max}
        step={o.step ?? 1}
        value={pair[end]}
        format={o.format ?? num}
        class={track}
        oninput={(e) => setEnd(path, end, `${THEME_LABELS[phase]}: ${labels[end].toLowerCase()}`, Number(e.currentTarget.value), pair)}
      >
        {#snippet labelEnd()}
          <SkyReset label={labels[end]} changed={pair[end] !== start[end]} onclick={() => setEnd(path, end, `${THEME_LABELS[phase]}: reset ${labels[end].toLowerCase()}`, start[end], pair)} />
        {/snippet}
      </Slider>
    {/each}
  </div>
{/snippet}
{#snippet colour(path: (string | number)[], label: string, hint: string)}
  <div class="relative" use:hinted={hint}>
    <!-- At the end of the label's line. -->
    <span class="absolute right-0 top-0"><SkyReset {label} changed={changed(path)} onclick={() => reset(path, label)} /></span>
    <Input
      id="bird-{path.join('-')}"
      name="bird-{path.join('-')}"
      type="color"
      size="sm"
      {label}
      value={hex(birdValue(S, path) as Rgb)}
      class="h-9 w-full cursor-pointer p-1"
      oninput={(e: Event) => setBirdValue(path, `${THEME_LABELS[phase]}: ${label.toLowerCase()}`, rgb((e.currentTarget as HTMLInputElement).value))}
    />
  </div>
{/snippet}

{#if stage.tags && open && shown}
  <!-- A name under each flock in the sky. -->
  <div class="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
    {#each live as e (e.id)}
      <span
        class="absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-xs leading-none text-foreground shadow-sm {e.leaving ? 'opacity-50' : ''}"
        style={`left: clamp(4rem, ${e.x}px, calc(100vw - 4rem)); top: ${e.y + 28}px;`}
      >
        {nameOf(e)} · {e.birds}
      </span>
    {/each}
  </div>
{/if}

{#if shown}
  <SkyPanel mode={{ key: "birds", label: "Birds" }} {modes} {onmode} bind:open {savedNote}>
    {#snippet tools()}
      <SkyBarTool name="undo" label="Undo (Ctrl+Z)" onclick={() => step(-1)} disabled={history.at < 0} />
      <SkyBarTool name="redo" label="Redo (Shift+Ctrl+Z)" onclick={() => step(1)} disabled={history.at >= history.changes.length - 1} />
      <span class="mx-1 h-5 w-px bg-secondary/20 max-sm:hidden" aria-hidden="true"></span>
      <SkyBarTool name="tag" label={stage.tags ? "Name tags are on. Click to hide them." : "Show a name tag under each flock"} onclick={() => (stage.tags = !stage.tags)} pressed={stage.tags} />
      <SkyBarTool name="locked" label={paused ? "Birds are held still. Click to let them fly." : "Hold birds still"} onclick={() => (paused = !paused)} pressed={paused} />
    {/snippet}

    {#if !current.runner}
      <p class="px-4 py-4 {hintCls}">There are no birds on this page. They are off in this build, or the device asks for less motion.</p>
    {:else}
      <div class="shrink-0 border-b border-secondary/15 px-6 py-4 max-sm:px-4 max-sm:py-1.5" use:hinted={"The time of day to look at. The schedule, flight and look below are the ones for this time. The clock takes the sky back within half a minute if your theme follows it."}>
        <SegmentedPicker
          options={[...SKY_PHASES]}
          selectedKey={phase}
          label="Time of day"
          onSelect={setPhase}
          class="flex gap-1 max-sm:flex-nowrap max-sm:overflow-x-auto sm:flex-wrap"
          optionClass="items-center gap-1.5 rounded-xl border p-2 max-sm:shrink-0 max-sm:p-1"
        >
          {#snippet option(p)}
            <SkySwatch phase={p} class="w-10 rounded-md border max-sm:w-7" />
            <span class="font-mono text-xs leading-none max-sm:sr-only">{THEME_LABELS[p]}</span>
          {/snippet}
        </SegmentedPicker>
      </div>
      <Tabs
        tabs={TABS}
        selected={tab}
        onSelect={(k) => (tab = k)}
        label="Bird settings"
        class="min-h-0 flex-1 gap-0 px-6 pt-3 max-sm:px-4 max-sm:pt-2"
        panelClass="min-h-0 flex-1 overflow-y-auto pt-6 pb-8 pl-4 -ml-4 pr-3 -mr-3 max-sm:pt-4 max-sm:pb-5"
      >
        {#snippet aside()}
          <SkyResetAll what={tab === "stage" ? "" : `the ${tabName} settings for this time of day`} changed={tabChanged} onReset={resetTab} />
        {/snippet}
        {#snippet panel(key)}
          <div class={ui.sections}>
            {#if key === "stage"}
              <section class={group} aria-label="In the sky now">
                <h3 class={heading}>In the sky now</h3>
                {#if live.length === 0}
                  <p class={hintCls}>The sky is empty.</p>
                {:else}
                  <ul class="flex flex-col gap-1">
                    {#each live as e (e.id)}
                      <li class="{row} {e.leaving ? 'opacity-60' : ''}">
                        <span class="min-w-0 flex-1">
                          <span class="block font-mono text-xs leading-tight">{nameOf(e)}{#if ENGINE[e.kind]}<span class="ml-1 text-xs opacity-60">{ENGINE[e.kind]}</span>{/if}</span>
                          <span class="block truncate text-xs leading-tight text-foreground-darker">{e.sentence}</span>
                        </span>
                        <span class="shrink-0 font-mono text-xs tabular-nums text-foreground-darker">{e.birds} · {Math.round(e.age)} s</span>
                        {#if e.leaving}
                          <span class="shrink-0 font-mono text-xs text-foreground-darker">leaving</span>
                        {:else}
                          <span use:hinted={"Asks this flock to leave. It flies off; it does not vanish."}>
                            {@render action("Send away", () => current.runner?.retire(e.id))}
                          </span>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </section>
              <section class={group} aria-label="Coming next">
                <h3 class={heading}>Coming next</h3>
                {#if !stage.auto}
                  <p class={hintCls}>The schedule is off. Only the flocks you send will come.</p>
                {:else if next.length === 0}
                  <p class={hintCls}>Nothing is planned for {when}.</p>
                {:else}
                  <ul class="flex flex-col gap-1">
                    {#each next as e, i (i)}
                      <li class={row}>
                        <span class="min-w-0 flex-1 font-mono text-xs">{nameOf(e)}</span>
                        <span class="shrink-0 font-mono text-xs tabular-nums text-foreground-darker">{e.birds} · in {secs(Math.max(0, Math.round(e.in)))}</span>
                        <span use:hinted={"Sends this one now. The ones before it are skipped."}>
                          {@render action("Send now", () => current.runner?.sendNext(i))}
                        </span>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </section>
              <section class={group} aria-label="Send a flock">
                <h3 class={heading}>Send a flock</h3>
                <SegmentedPicker
                  options={KINDS}
                  optionKey={(o) => o.key}
                  selectedKey={stage.kind}
                  label="Kind of flock"
                  onSelect={(o) => pickKind(o.key)}
                  variant="pill"
                  class="flex-wrap gap-1"
                  optionClass="px-3 py-1.5 font-mono text-xs"
                  option={kindPill}
                />
                <div use:hinted={"How many birds are in the flock."}>
                  <Slider id="bird-stage-count" size="sm" label="How many" min={limitOf(stage.kind).count[0]} max={limitOf(stage.kind).count[1]} bind:value={stage.count} format={(v) => `${v} ${v === 1 ? "bird" : "birds"}`} class={track} />
                </div>
                <div use:hinted={"How far from you the flock flies. Far flocks are small."}>
                  <Slider id="bird-stage-depth" size="sm" label="How far" min={limitOf(stage.kind).depth[0]} max={limitOf(stage.kind).depth[1]} step={2} bind:value={stage.depth} format={metres} class={track} />
                </div>
                <div use:hinted={"A twist is something special the flock does. Let the time of day pick, send it plain, or pick the twist."}>
                  <Select id="bird-stage-twist" size="sm" class="px-3 py-2" label="Twist" bind:value={stage.twist}>
                    <option value="roll">Let the time of day pick</option>
                    <option value="none">None</option>
                    {#each twistsFor(stage.kind) as m (m.id)}
                      <option value={m.id}>{m.label}</option>
                    {/each}
                  </Select>
                  <!-- Two lines always, so the buttons below hold their place. -->
                  <p class="{hintCls} mt-1.5 line-clamp-2 min-h-[2lh]">
                    {stage.twist === "roll"
                      ? "The time of day decides: most flocks come plain, some with a twist."
                      : stage.twist === "none"
                        ? "The flock comes plain."
                        : (MODIFIERS.find((m) => m.id === stage.twist)?.about ?? "")}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-1">
                  <Button variant="primary" intent="compact" radius="rounded" class={compact} onclick={send}>Send</Button>
                  <span use:hinted={"Sends the last flock again: the same birds on the same path. Use it to compare one change with the last."}>
                    {@render action("Send same again", again, !sent)}
                  </span>
                  <span class="ml-auto" use:hinted={"Empties the sky at once."}>
                    {@render action("Clear sky", () => current.runner?.clear())}
                  </span>
                </div>
                <div use:hinted={"When the sky is empty, the same flock is sent again, so there is always one to look at."}>
                  <SwitchField size="sm" label="Keep one coming" checked={stage.keep} onchange={(v) => (stage.keep = v)} />
                </div>
              </section>
              <section class={group} aria-label="The day's schedule">
                <h3 class={heading}>The day's schedule</h3>
                <div use:hinted={"On: flocks come by themselves, as the Schedule tab says. Off: only the flocks you send come."}>
                  <SwitchField size="sm" label="Flocks come by themselves" checked={stage.auto} onchange={(v) => (stage.auto = v)} />
                </div>
                <div class="flex flex-col gap-1.5" use:hinted={"Makes the birds and the schedule run slower or faster than they really would."}>
                  <span class="text-xs text-foreground">Speed of time</span>
                  <SegmentedPicker
                    options={RATES}
                    optionKey={(o) => o.key}
                    selectedKey={String(stage.speed)}
                    label="Speed of time"
                    onSelect={(o) => (stage.speed = Number(o.key))}
                    variant="pill"
                    class="gap-1"
                    optionClass="px-3 py-1.5 font-mono text-xs"
                    option={pill}
                  />
                </div>
              </section>
            {:else if key === "schedule"}
              <p class="{hintCls} max-sm:hidden">What comes by itself at {when}. Pick another time of day above to change that one.</p>
              <section class={group} aria-label="How often">
                <h3 class={heading}>How often</h3>
                {@render knob(["scenarios", phase, "perHour"], "Flocks per hour", "How many flocks start in an hour at this time of day, on a day that has birds. The gaps between them vary. At never, the sky has no flocks.", { min: 0, max: 300, step: 0.5, format: perHour, note: `${THEME_LABELS[phase]}: ` })}
                {@render knob(["scenarios", phase, "days"], "Days with birds", "On how many days this time of day has flocks at all. On the other days it has clouds only. Everyone sees the same on a day.", { min: 0, max: 1, step: 0.01, format: (v) => (v >= 1 ? "every day" : v <= 0 ? "no day" : `${Math.round(v * 100)}% of days`), note: `${THEME_LABELS[phase]}: ` })}
                {@render range(["scenarios", phase, "first"], ["First flock from", "First flock by"], "How long the sky stays empty after this time of day begins: the first flock comes between these two.", { min: 0, max: 120, format: secs })}
              </section>
              <section class={group} aria-label="Kinds">
                <h3 class={heading}>Kinds</h3>
                {#if scenario.events.length === 0}
                  <p class={hintCls}>No birds fly at {when}. Add a kind to change that.</p>
                {:else}
                  <p class={hintCls}>Which kinds come at {when}, and each one's share of the flocks. How large a kind's flocks are and how far they fly is set once for all day, on the Flight tab.</p>
                {/if}
                {#each scenario.events as e, i (i)}
                  <!-- One row a kind: its share, and the way out at the row's end. -->
                  <div class="flex items-center gap-1">
                    <div class="min-w-0 flex-1">
                      {@render knob(["scenarios", phase, "events", i, "weight"], KIND[e.kind], `How many of the flocks at this time of day are ${KIND[e.kind].toLowerCase()}, next to the other kinds. At never it does not come.`, {
                        min: 0,
                        max: 10,
                        step: 0.5,
                        format: (v) => (v === 0 ? "never" : `${Math.round((v / Math.max(0.5, weightSum)) * 100)}% of flocks`),
                        note: `${THEME_LABELS[phase]}, ${KIND[e.kind].toLowerCase()}: `,
                      })}
                    </div>
                    <SkyBarTool name="delete" label="Take {KIND[e.kind].toLowerCase()} out of {when}" onclick={() => removeKind(i)} />
                  </div>
                {/each}
                <div class="flex flex-wrap gap-1" use:hinted={"Adds a kind of flock to the ones that come at this time of day. A kind that is there already cannot be added again."}>
                  {#each KINDS as k (k.key)}
                    {@const there = scenario.events.some((e) => e.kind === k.key)}
                    <Button variant={there ? "disabled" : "outline"} intent="compact" radius="rounded" class="{compact} gap-1" disabled={there} onclick={() => addKind(k.key)}>
                      <Icon name="add" size="xs" />{@render kindPill(k)}
                    </Button>
                  {/each}
                </div>
              </section>
            {:else if key === "flight"}
              <p class="{hintCls} max-sm:hidden">How each kind flies. Its size and distance, its seasons and its twists are the same all day; the rest is for {when}.</p>
              <section class={group} aria-label="Geese">
                {@render fold("Geese", ENGINE.skein)}
                {#if !folded.Geese}
                  <p class="font-mono text-xs text-foreground-darker">All day</p>
                  {@render range(["limits", "skein", "count"], ["Fewest birds", "Most birds"], "Every flock of this kind has a number of birds between these two, at every time of day. Small screens get fewer.", { min: RANGES.skein.count[0], max: RANGES.skein.count[1], format: (v) => `${v} birds` })}
                  {@render range(["limits", "skein", "depth"], ["Nearest", "Farthest"], "How far from you this kind flies, at every time of day. Far flocks are small.", { min: RANGES.skein.depth[0], max: RANGES.skein.depth[1], step: 2, format: metres })}
                  <p class="font-mono text-xs text-foreground-darker">At {when}</p>
                  {@render range(["scenarios", phase, "tune", "skein", "band"], ["Highest line", "Lowest line"], "How high on the screen a line of geese may cross.", { min: 0, max: 0.9, step: 0.01, format: down })}
                  {@render knob(["scenarios", phase, "tune", "skein", "speed"], "Speed", "How fast geese cross the sky.", { min: 0.5, max: 2, step: 0.05, format: times, note: `${THEME_LABELS[phase]}, geese: ` })}
                {/if}
              </section>
              <section class={group} aria-label="Gulls">
                {@render fold("Gulls")}
                {#if !folded.Gulls}
                  <p class="font-mono text-xs text-foreground-darker">All day</p>
                  {@render range(["limits", "soar", "count"], ["Fewest birds", "Most birds"], "Every flock of this kind has a number of birds between these two, at every time of day. Small screens get fewer.", { min: RANGES.soar.count[0], max: RANGES.soar.count[1], format: (v) => `${v} birds` })}
                  {@render range(["limits", "soar", "depth"], ["Nearest", "Farthest"], "How far from you this kind flies, at every time of day. Far flocks are small.", { min: RANGES.soar.depth[0], max: RANGES.soar.depth[1], step: 2, format: metres })}
                  <p class="font-mono text-xs text-foreground-darker">At {when}</p>
                  {@render range(["scenarios", phase, "tune", "soar", "radius"], ["Tightest circle", "Widest circle"], "How wide the gulls circle once they have come together.", { min: 4, max: 30, format: metres })}
                  {@render range(["scenarios", phase, "tune", "soar", "glide"], ["Shortest glide", "Longest glide"], "How long a gull glides before it beats its wings again.", { min: 1, max: 30, format: secs })}
                {/if}
              </section>
              <section class={group} aria-label="Hawk">
                {@render fold("Hawk", ENGINE.raptor)}
                {#if !folded.Hawk}
                  <p class="font-mono text-xs text-foreground-darker">All day</p>
                  {@render range(["limits", "raptor", "depth"], ["Nearest", "Farthest"], "How far from you this kind flies, at every time of day. Far flocks are small.", { min: RANGES.raptor.depth[0], max: RANGES.raptor.depth[1], step: 2, format: metres })}
                  <p class="font-mono text-xs text-foreground-darker">At {when}</p>
                  {@render range(["scenarios", phase, "tune", "raptor", "height"], ["Highest", "Lowest"], "How high on the screen the hawk circles.", { min: 0.05, max: 0.8, step: 0.01, format: down })}
                {/if}
              </section>
              <section class={group} aria-label="Starlings">
                {@render fold("Starlings", ENGINE.murmuration)}
                {#if !folded.Starlings}
                  <p class="font-mono text-xs text-foreground-darker">All day</p>
                  {@render range(["limits", "murmuration", "count"], ["Fewest birds", "Most birds"], "Every flock of this kind has a number of birds between these two, at every time of day. Small screens get fewer.", { min: RANGES.murmuration.count[0], max: RANGES.murmuration.count[1], format: (v) => `${v} birds` })}
                  {@render range(["limits", "murmuration", "depth"], ["Nearest", "Farthest"], "How far from you this kind flies, at every time of day. Far flocks are small.", { min: RANGES.murmuration.depth[0], max: RANGES.murmuration.depth[1], step: 2, format: metres })}
                  <p class="font-mono text-xs text-foreground-darker">At {when}</p>
                  {@render knob(["scenarios", phase, "tune", "murmuration", "size"], "Size of the cloud", "Makes every cloud of starlings smaller or larger at this time of day.", { min: 0.2, max: 2, step: 0.05, format: times, note: `${THEME_LABELS[phase]}, starlings: ` })}
                {/if}
              </section>
              <section class={group} aria-label="Seasons">
                {@render fold("Seasons")}
                {#if !folded.Seasons}
                  <p class={hintCls}>How much more or less often each kind comes in each month, next to the other kinds. The bar in the middle is as often as usual.</p>
                  {#each KINDS as k (k.key)}
                    <div class="flex flex-col gap-1.5" use:hinted={`Month by month, how often ${k.label.toLowerCase()} are picked: at the bottom never, in the middle as usual, at the top twice as often.`}>
                      <span class="flex items-center gap-1 font-mono text-xs">
                        {k.label}
                        <SkyReset label="{k.label} seasons" changed={changed(["seasons", k.key])} onclick={() => reset(["seasons", k.key], `${k.label} seasons`)} />
                      </span>
                      <div class="grid grid-cols-12 gap-1" role="group" aria-label="{k.label}, month by month">
                        {#each MONTHS as month, m (month)}
                          <div class="flex flex-col items-center gap-1 {m === thisMonth ? 'text-foreground' : 'text-foreground-darker'}">
                            <Slider
                              id="bird-season-{k.key}-{m}"
                              size="sm"
                              label="{k.label} in {month}"
                              hideLabel
                              showValue={false}
                              min={0}
                              max={2}
                              step={0.1}
                              value={S.seasons[k.key]?.[m] ?? 1}
                              class="items-center [&_input]:h-14 [&_input]:w-1.5 [&_input]:bg-secondary/25 [&_input]:[direction:rtl] [&_input]:[writing-mode:vertical-lr]"
                              oninput={(e) => setBirdValue(["seasons", k.key, m], `${k.label}: ${month}`, Number(e.currentTarget.value))}
                            />
                            <span class="font-mono text-[10px] leading-none">{month.slice(0, 1)}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/each}
                {/if}
              </section>
              <section class={group} aria-label="Twists">
                <h3 class={heading}>Twists</h3>
                {@render knob(["twoTwists"], "A flock with two twists", "How many flocks do two special things at once.", { min: 0, max: 0.5, step: 0.01, format: (v) => `${Math.round(v * 100)}% of flocks` })}
              </section>
              {#each KINDS as k (k.key)}
                {@const title = `${k.label} twists`}
                <section class={group} aria-label={title}>
                  {@render fold(title)}
                  {#if !folded[title]}
                    {@render knob(["twistShare", k.key], "With a twist", `How many flocks of ${k.label.toLowerCase()} do one special thing.`, { min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}% of flocks`, note: `${k.label}: ` })}
                    {#each twistsFor(k.key) as m (m.id)}
                      <div class="flex flex-col gap-1.5">
                        {@render knob(["twists", m.id], m.label.charAt(0).toUpperCase() + m.label.slice(1), `${m.about} The slider says how often it is picked next to this kind's other twists. ${twistTimes(m)}`, {
                          min: 0,
                          max: 4,
                          step: 0.25,
                          format: (v) => (v === 0 ? "never" : times(v)),
                          note: "Twist: ",
                        })}
                        <p class={hintCls}>{m.about} {twistTimes(m)}</p>
                      </div>
                    {/each}
                  {/if}
                </section>
              {/each}
            {:else if key === "look"}
              <p class="{hintCls} max-sm:hidden">How the birds look at {when}. A change shows on the birds in the sky as you make it.</p>
              <section class={group} aria-label="Colours">
                <h3 class={heading}>Colours</h3>
                <div class="grid grid-cols-2 gap-3">
                  {@render colour(["palettes", phase, "body"], "Bird colour", "The colour of a bird that is near.")}
                  {@render colour(["palettes", phase, "fog"], "Haze colour", "Far birds fade toward this colour. Set it close to the sky behind them.")}
                </div>
                {@render knob(["palettes", phase, "lit"], "Light", "How much the light shows on wings and bodies. At flat, a bird is one dark shape.", {
                  min: 0,
                  max: 1,
                  step: 0.01,
                  format: (v) => (v < 0.04 ? "flat" : v < 0.2 ? "faint" : v < 0.5 ? "soft" : "bright"),
                  note: `${THEME_LABELS[phase]}: `,
                })}
              </section>
              <section class={group} aria-label="All day">
                <h3 class={heading}>All day</h3>
                {@render knob(["scale"], "Size", "Makes every bird smaller or larger on the screen.", { min: 0.5, max: 2.5, step: 0.05, format: (v) => (v === 1 ? "real size" : `${num(v)}×`) })}
              </section>
            {/if}
          </div>
        {/snippet}
      </Tabs>
    {/if}
  </SkyPanel>
{/if}
