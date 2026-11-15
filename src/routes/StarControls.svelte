<!--
  The stars part of the sky controls, shown when the URL carries `?stars`.
  Takes the star field's settings over from the code while it is mounted
  (`starLab`): what the field is made of, how it turns and drifts, the events
  that cross it (each can be sent by hand), and the constellations set among
  the stars. Kept in this browser, with an undo history, and saved as text
  with the rest.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { CONSTELLATIONS, STAR_SETTINGS, type StarEventKind, type StarSettings } from "@/lib/sky-stars";
  import { loadStarSettings, setStarValue, STARS, starHistory, starLab, starStage, starValue } from "@/lib/sky-stars-lab.svelte";
  import { showSky, skyStrength } from "@/lib/sky-colours-lab.svelte";
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import { SKY_PHASES, type SkyPhase, THEME_LABELS } from "@orakl/shared";
  import Button from "@/lib/components/ui/Button.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import SegmentedPicker from "@/lib/components/ui/SegmentedPicker.svelte";
  import Slider from "@/lib/components/ui/Slider.svelte";
  import SwitchField from "@/lib/components/ui/SwitchField.svelte";
  import Tabs from "@/lib/components/ui/Tabs.svelte";
  import SkyBarTool from "./SkyBarTool.svelte";
  import SkyPanel from "./SkyPanel.svelte";
  import SkyReset from "./SkyReset.svelte";
  import SkyResetAll from "./SkyResetAll.svelte";
  import { hinted, keepNow, keepSoon, skyFolds, skyParts, skyTab, skyTabs, skyView, ui } from "./sky-panel.svelte";

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

  const STORE = "orakl-star-lab";
  const TABS = [
    { key: "field", label: "Field" },
    { key: "motion", label: "Motion" },
    { key: "events", label: "Events" },
    { key: "figures", label: "Constellations" },
  ];
  const FIGURES = Object.entries(CONSTELLATIONS).map(([key, c]) => ({ key, ...c }));

  const S = $derived(starLab.settings);
  const history = $derived(starHistory.of(STARS));

  let phase = $state<SkyPhase>("night");
  let tab = $state(skyTab("stars", TABS, "field"));
  $effect(() => {
    skyTabs.stars = tab;
  });
  const folded = skyFolds("stars");
  let savedNote = $state(false);
  /** Whether the stars can be seen at the time of day in the sky. */
  const dark = $derived(skyStrength(phase).stars > 0);

  const track = `${ui.slider} [&_input]:bg-secondary/25`;
  const num = (v: number) => String(+v.toFixed(2));
  const times = (v: number) => (v === 1 ? "as it is" : `${num(v)}×`);
  const pct = (v: number) => (v === 0 ? "none" : `${Math.round(v * 100)}%`);
  const secs = (v: number) => (v < 90 ? `${num(v)} s` : `${num(v / 60)} min`);
  const perHour = (v: number) => (v === 0 ? "never" : v < 1 ? `one in ${num(1 / v)} h` : `${num(v)} an hour`);

  const changed = (path: (string | number)[]) => JSON.stringify(starValue(S, path)) !== JSON.stringify(starValue(STAR_SETTINGS, path));
  const reset = (path: (string | number)[], label: string) => setStarValue(path, `Reset ${label.toLowerCase()}`, structuredClone(starValue(STAR_SETTINGS, path)));

  /** Sets one end of a [low, high] pair and moves the other end along when they would cross. */
  function setEnd(path: (string | number)[], end: 0 | 1, label: string, value: number) {
    const pair = [...(starValue(S, path) as [number, number])] as [number, number];
    pair[end] = value;
    if (pair[0] > pair[1]) pair[1 - end] = value;
    setStarValue(path, label, pair);
  }

  function toggleFigure(key: string) {
    const shownNow = S.constellations.shown;
    const name = CONSTELLATIONS[key]?.name ?? key;
    setStarValue(
      ["constellations", "shown"],
      shownNow.includes(key) ? `Took out ${name}` : `Added ${name}`,
      shownNow.includes(key) ? shownNow.filter((k) => k !== key) : [...shownNow, key],
    );
  }

  const send = (kind: StarEventKind) => starStage.send(kind);

  /** The settings each tab holds, by their top-level names. */
  const TAB_KEYS: Record<string, (keyof StarSettings)[]> = {
    field: ["count", "size", "brightness", "faint", "twinkle", "twinkleSpeed", "shimmer", "colour"],
    motion: ["turn", "pivot", "drift"],
    events: ["eventRates", "shooting", "shower", "satellite", "aurora", "comet"],
    figures: ["constellations"],
  };
  const tabName = $derived(TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? "");
  const tabChanged = $derived((TAB_KEYS[tab] ?? []).some((key) => changed([key])));
  /** Resets every setting on the open tab, as one change. */
  function resetTab() {
    for (const key of TAB_KEYS[tab] ?? []) if (changed([key])) setStarValue([key], `Reset all: ${tabName}`, structuredClone(STAR_SETTINGS[key]));
  }

  /** Sets how often star events come at one time of day; "as set" keeps no value of its own. */
  function setRate(p: SkyPhase, value: number) {
    const { [p]: _own, ...rest } = S.eventRates ?? {};
    setStarValue(["eventRates"], `${THEME_LABELS[p]}: star events`, value === 1 ? rest : { ...rest, [p]: value });
  }

  function step(by: -1 | 1) {
    if (by < 0) starHistory.undo(STARS);
    else starHistory.redo(STARS);
  }

  function load(data: Partial<StarSettings>) {
    loadStarSettings(data);
    starHistory.clearAll();
  }

  function startOver() {
    starLab.settings = structuredClone(STAR_SETTINGS);
    starHistory.clearAll();
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

  /** The turning point dragged on the sky. */
  function pivotMove(e: PointerEvent) {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    setStarValue(["pivot"], "Moved the turning point", [+(e.clientX / innerWidth).toFixed(3), +(e.clientY / innerHeight).toFixed(3)]);
  }

  let savedTimer: ReturnType<typeof setTimeout> | undefined;

  // Load what was kept, take over the stars, and hand them back on the way out.
  onMount(() => {
    try {
      const kept = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (kept?.v === 1) loadStarSettings(kept.settings);
    } catch {
      // nothing kept, or not readable: the code's own stars
    }
    starHistory.load();
    starLab.active = true;
    skyParts.stars = {
      label: "Stars",
      data: () => $state.snapshot(starLab.settings),
      load,
      timelines: () => [
        { name: "Stars", ...starHistory.of(STARS), goTo: (i) => starHistory.goTo(STARS, i), forget: () => starHistory.clear(STARS) },
      ],
      resetLabel: "Put the stars back",
      resetNote: "Puts every star setting back as it comes, and forgets the star history. The sky, clouds and birds stay.",
      reset: startOver,
    };
    const unsubscribe = subscribeSkyPhase((p) => (phase = p));
    return () => {
      keepNow();
      starLab.active = false;
      starLab.paused = false;
      delete skyParts.stars;
      unsubscribe();
      clearTimeout(savedTimer);
    };
  });

  $effect(() => {
    const text = JSON.stringify({ v: 1, settings: S });
    if (!starLab.active) return;
    keepSoon(STORE, text, () => {
      savedNote = true;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => (savedNote = false), 1500);
    });
  });
</script>

<svelte:window onkeydown={onKey} />

{#snippet action(text: string, onclick: () => void, disabled = false)}
  <Button variant={disabled ? "disabled" : "outline"} intent="compact" radius="rounded" class={ui.compact} {disabled} {onclick}>{text}</Button>
{/snippet}
{#snippet fold(title: string)}
  <h3 class={ui.heading}>
    <Button
      unstyled
      aria-expanded={!folded[title]}
      class="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center justify-between rounded-lg px-1 py-0.5 text-left hover:bg-secondary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary"
      onclick={() => (folded[title] = !folded[title])}
    >
      {title}
      <Icon name={folded[title] ? "expand" : "collapse"} usage="sky.star-fold" class="text-foreground-darker" size="sm" />
    </Button>
  </h3>
{/snippet}
<!-- One number of the settings as a slider, with its reset after the label. -->
{#snippet knob(path: (string | number)[], label: string, hint: string, o: { min: number; max: number; step?: number; format?: (v: number) => string })}
  <div use:hinted={hint} role="group" aria-label={label} ondblclick={() => changed(path) && reset(path, label)}>
    <Slider
      id="star-{path.join('-')}"
      size="sm"
      {label}
      min={o.min}
      max={o.max}
      step={o.step ?? 1}
      value={starValue(S, path) as number}
      format={o.format ?? num}
      class={track}
      oninput={(e) => setStarValue(path, label, Number(e.currentTarget.value))}
    >
      {#snippet labelEnd()}<SkyReset {label} changed={changed(path)} onclick={() => reset(path, label)} />{/snippet}
    </Slider>
  </div>
{/snippet}
<!-- One end of a [low, high] pair as a slider. -->
{#snippet end(path: (string | number)[], which: 0 | 1, label: string, hint: string, o: { min: number; max: number; step?: number; format?: (v: number) => string })}
  <div use:hinted={hint}>
    <Slider
      id="star-{path.join('-')}-{which}"
      size="sm"
      {label}
      min={o.min}
      max={o.max}
      step={o.step ?? 1}
      value={(starValue(S, path) as [number, number])[which]}
      format={o.format ?? num}
      class={track}
      oninput={(e) => setEnd(path, which, label, Number(e.currentTarget.value))}
    >
      {#snippet labelEnd()}
        <SkyReset
          {label}
          changed={(starValue(S, path) as [number, number])[which] !== (starValue(STAR_SETTINGS, path) as [number, number])[which]}
          onclick={() => setEnd(path, which, `Reset ${label.toLowerCase()}`, (starValue(STAR_SETTINGS, path) as [number, number])[which])}
        />
      {/snippet}
    </Slider>
  </div>
{/snippet}

{#if shown && open && tab === "motion" && skyView.view === "settings" && dark}
  <!-- The point the sky turns about, to drag on the sky itself when it is on the screen. -->
  <div
    role="slider"
    tabindex="0"
    aria-label="Turning point of the sky"
    aria-valuenow={Math.round(S.pivot[1] * 100)}
    aria-valuetext="{Math.round(S.pivot[0] * 100)}% across, {Math.round(S.pivot[1] * 100)}% down"
    class="fixed z-40 size-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border border-dashed border-white/70 bg-white/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary active:cursor-grabbing"
    style={`left: clamp(1.5rem, ${S.pivot[0] * 100}vw, calc(100vw - 1.5rem)); top: clamp(1.5rem, ${S.pivot[1] * 100}dvh, calc(100dvh - 1.5rem));`}
    onpointerdown={(e) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    }}
    onpointermove={pivotMove}
  >
    <span class="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"></span>
  </div>
{/if}

{#if shown}
  <SkyPanel mode={{ key: "stars", label: "Stars" }} {modes} {onmode} bind:open {savedNote}>
    {#snippet tools()}
      <SkyBarTool name="undo" usage="sky.star-bar" label="Undo (Ctrl+Z)" onclick={() => step(-1)} disabled={history.at < 0} />
      <SkyBarTool name="redo" usage="sky.star-bar" label="Redo (Shift+Ctrl+Z)" onclick={() => step(1)} disabled={history.at >= history.changes.length - 1} />
      <span class="mx-1 h-5 w-px bg-secondary/20 max-sm:hidden" aria-hidden="true"></span>
      <SkyBarTool name="locked" usage="sky.star-bar" label={starLab.paused ? "The stars are held still. Click to let them turn." : "Hold the stars still"} onclick={() => (starLab.paused = !starLab.paused)} pressed={starLab.paused} />
    {/snippet}

      {#if !dark}
        <!-- Stars cannot be seen by day: say so, and offer the way to a time when they can. -->
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-secondary/15 px-6 py-3 max-sm:px-4" role="status">
          <p class={ui.hint}>The stars do not show at this time of day.</p>
          {@render action("Go to night", () => showSky("night"))}
        </div>
      {/if}
      <Tabs
        tabs={TABS}
        selected={tab}
        onSelect={(k) => (tab = k)}
        label="Star settings"
        class="min-h-0 flex-1 gap-0 px-6 pt-3 max-sm:px-4 max-sm:pt-2"
        panelClass="min-h-0 flex-1 overflow-y-auto pt-6 pb-8 pl-4 -ml-4 pr-3 -mr-3 max-sm:pt-4 max-sm:pb-5"
      >
        {#snippet aside()}<SkyResetAll what="the {tabName} settings" changed={tabChanged} onReset={resetTab} />{/snippet}
        {#snippet panel(pane)}
          <div class={ui.sections}>
            {#if pane === "field"}
              <section class={ui.group} aria-label="Stars">
                <h3 class={ui.heading}>Stars</h3>
                {@render knob(["count"], "How many", "How many stars are in the sky. More stars cost a phone more work.", { min: 40, max: 600, step: 10, format: (v) => `${v} stars` })}
                {@render knob(["size"], "Largest", "How big the biggest stars are.", { min: 0.6, max: 3, step: 0.1, format: (v) => (v < 1.2 ? "small" : v < 2 ? "medium" : "large") })}
                {@render knob(["brightness"], "Brightness", "Makes every star dimmer or brighter.", { min: 0.3, max: 1.6, step: 0.05, format: times })}
                {@render knob(["faint"], "Faint stars", "At none, bright and faint stars are mixed evenly. Higher gives a real sky: a few bright stars among many faint ones.", { min: 0, max: 1, step: 0.05, format: (v) => (v === 0 ? "even mix" : v < 0.5 ? "more faint" : "mostly faint") })}
              </section>
              <section class={ui.group} aria-label="Twinkle and colour">
                <h3 class={ui.heading}>Twinkle and colour</h3>
                {@render knob(["twinkle"], "Twinkle", "How much the stars flicker. Stars low in the sky flicker most, as real ones do.", { min: 0, max: 1, step: 0.05, format: (v) => (v === 0 ? "steady" : v < 0.4 ? "gentle" : v < 0.75 ? "lively" : "restless") })}
                {#if S.twinkle > 0}
                  {@render knob(["twinkleSpeed"], "Twinkle speed", "How fast the flicker runs.", { min: 0.25, max: 3, step: 0.05, format: times })}
                {/if}
                {@render knob(["shimmer"], "Shimmer", "Each star's brightness jumps a little from frame to frame, and it flashes a pale colour now and then. Stronger means bigger jumps and more flashes.", { min: 0, max: 1, step: 0.05, format: pct })}
                {@render knob(["colour"], "Star colours", "At white, every star is white. Higher tints some blue-white and some orange, as real stars are.", { min: 0, max: 1, step: 0.05, format: (v) => (v === 0 ? "all white" : v < 0.6 ? "a little colour" : "natural") })}
              </section>
            {:else if pane === "motion"}
              <section class={ui.group} aria-label="Turn">
                <h3 class={ui.heading}>Turn</h3>
                {@render knob(["turn"], "Speed", "How fast the whole sky turns. Below still, it turns the other way.", { min: -12, max: 12, step: 0.5, format: (v) => (v === 0 ? "still" : v === 1 ? "as it is" : `${num(Math.abs(v))}×${v < 0 ? ", backward" : ""}`) })}
                {@render knob(["pivot", 0], "Turning point, across", "Where the point the sky turns about sits, from the left edge to the right. On the sky it is the dashed ring: drag it.", { min: -0.5, max: 1.5, step: 0.01, format: (v) => `${Math.round(v * 100)}%` })}
                {@render knob(["pivot", 1], "Turning point, down", "From above the top edge to below the foot. Put it on the screen for stars that wheel about one point, as about the pole star.", { min: -1, max: 1.5, step: 0.01, format: (v) => (v < 0 ? `${Math.round(-v * 100)}% above the top` : `${Math.round(v * 100)}%`) })}
              </section>
              <section class={ui.group} aria-label="Drift">
                <h3 class={ui.heading}>Drift</h3>
                {@render knob(["drift"], "Speed", "A slow slide of the whole sky to the left and down, on top of the turn.", { min: 0, max: 12, step: 0.5, format: (v) => (v === 0 ? "none" : times(v)) })}
              </section>
            {:else if pane === "events"}
              <section class={ui.group} aria-label="By time of day">
                {@render fold("By time of day")}
                {#if !folded["By time of day"]}
                  <p class={ui.hint}>Makes every timed event below come less or more often at one time of day. The same value is on the Sky part's Life tab.</p>
                  {#each SKY_PHASES.filter((p) => skyStrength(p).stars > 0) as p (p)}
                    {@const rate = S.eventRates?.[p] ?? 1}
                    <div use:hinted={`How often star events come at ${THEME_LABELS[p].toLowerCase()}, next to the rates set below.`}>
                      <Slider id="star-rate-{p}" size="sm" label={THEME_LABELS[p]} min={0} max={3} step={0.05} value={rate} format={(v) => (v === 0 ? "none" : v === 1 ? "as set" : `${num(v)}×`)} class={track} oninput={(e) => setRate(p, Number(e.currentTarget.value))}>
                        {#snippet labelEnd()}<SkyReset label={THEME_LABELS[p]} changed={rate !== 1} onclick={() => setRate(p, 1)} />{/snippet}
                      </Slider>
                    </div>
                  {/each}
                {/if}
              </section>
              <section class={ui.group} aria-label="Shooting stars">
                {@render fold("Shooting stars")}
                {#if !folded["Shooting stars"]}
                  {@render end(["shooting", "every"], 0, "Shortest wait", "The time from one shooting star to the next. Each wait falls between the shortest and the longest.", { min: 1, max: 120, format: secs })}
                  {@render end(["shooting", "every"], 1, "Longest wait", "The time from one shooting star to the next. Each wait falls between the shortest and the longest.", { min: 1, max: 300, format: secs })}
                  {@render knob(["shooting", "speed"], "Speed", "How fast a shooting star crosses.", { min: 0.3, max: 3, step: 0.05, format: times })}
                  {@render knob(["shooting", "tail"], "Tail", "How long the tail is.", { min: 0.3, max: 3, step: 0.05, format: times })}
                  {@render knob(["shooting", "brightness"], "Brightness", "How bright a shooting star is.", { min: 0.3, max: 1.6, step: 0.05, format: times })}
                  {@render knob(["shooting", "spread"], "Spread", "At narrow, all fly the same way. At wide, each takes its own line.", { min: 0, max: 1.5, step: 0.05, format: (v) => (v < 0.2 ? "narrow" : v < 0.8 ? "some" : "wide") })}
                  {@render knob(["shooting", "fireball"], "Fireballs", "How many shooting stars are fireballs: slower, brighter, with a flare of light. A fireball crosses the whole sky.", { min: 0, max: 1, step: 0.01, format: (v) => (v === 0 ? "none" : `${Math.round(v * 100)}% of them`) })}
                  <div class="flex flex-wrap gap-1">
                    {@render action("Send one", () => send("shooting"), !dark)}
                    {@render action("Send a fireball", () => send("fireball"), !dark)}
                  </div>
                {/if}
              </section>
              <section class={ui.group} aria-label="Meteor shower">
                {@render fold("Meteor shower")}
                {#if !folded["Meteor shower"]}
                  {@render knob(["shower", "perHour"], "How often", "For a while, many shooting stars fly out from one point in the sky.", { min: 0, max: 6, step: 0.25, format: perHour })}
                  {@render knob(["shower", "length"], "How long", "How long one shower lasts.", { min: 20, max: 600, step: 10, format: secs })}
                  {@render knob(["shower", "rate"], "How thick", "How many meteors come at the shower's height.", { min: 0.2, max: 6, step: 0.1, format: (v) => `${num(v)} a second` })}
                  {@render knob(["shower", "radiant", 0], "Comes from, across", "The point in the sky the meteors seem to fly out from.", { min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}%` })}
                  {@render knob(["shower", "radiant", 1], "Comes from, down", "The point in the sky the meteors seem to fly out from.", { min: 0, max: 0.6, step: 0.01, format: (v) => `${Math.round(v * 100)}%` })}
                  <div class="flex">{@render action("Start a shower", () => send("shower"), !dark)}</div>
                {/if}
              </section>
              <section class={ui.group} aria-label="Satellite">
                {@render fold("Satellite")}
                {#if !folded.Satellite}
                  {@render knob(["satellite", "perHour"], "How often", "A point of light that crosses the sky slowly on a straight line, then fades into the earth's shadow.", { min: 0, max: 30, step: 0.5, format: perHour })}
                  {@render knob(["satellite", "speed"], "Speed", "How fast one crosses. Real ones take a few minutes.", { min: 0.2, max: 4, step: 0.05, format: times })}
                  {@render knob(["satellite", "brightness"], "Brightness", "How bright the point of light is.", { min: 0.3, max: 1.6, step: 0.05, format: times })}
                  {@render knob(["satellite", "flare"], "Flares", "How many flare: for a moment the craft throws the sun at you and outshines every star. The craft of a train flare one after another at the same place. Some lone craft also blink as they tumble.", { min: 0, max: 1, step: 0.05, format: (v) => (v === 0 ? "none" : `${Math.round(v * 100)}% of them`) })}
                  {@render knob(["satellite", "train"], "Trains", "How many passes are a train: a line of craft one after another, as after a launch.", { min: 0, max: 1, step: 0.05, format: (v) => (v === 0 ? "none" : `${Math.round(v * 100)}% of them`) })}
                  <div class="flex flex-wrap gap-1">
                    {@render action("Send one", () => send("satellite"), !dark)}
                    {@render action("Send a train", () => send("train"), !dark)}
                  </div>
                {/if}
              </section>
              <section class={ui.group} aria-label="Aurora">
                {@render fold("Aurora")}
                {#if !folded.Aurora}
                  {@render knob(["aurora", "perHour"], "How often", "Slow curtains of green and violet light across the upper sky.", { min: 0, max: 6, step: 0.25, format: perHour })}
                  {@render knob(["aurora", "length"], "How long", "How long one display lasts. It fades in and out.", { min: 20, max: 600, step: 10, format: secs })}
                  {@render knob(["aurora", "strength"], "Strength", "How strongly the curtains glow.", { min: 0.1, max: 1, step: 0.05, format: pct })}
                  <div class="flex">{@render action("Start one", () => send("aurora"), !dark)}</div>
                {/if}
              </section>
              <section class={ui.group} aria-label="Comet">
                {@render fold("Comet")}
                {#if !folded.Comet}
                  {@render knob(["comet", "chance"], "Nights with comets", "On a night with comets, one crosses the sky every little while. It comes in small and slow at one side, gathers speed, and leaves long and bright at the other.", { min: 0, max: 1, step: 0.01, format: (v) => (v === 0 ? "none" : v === 1 ? "every night" : `${Math.round(v * 100)}% of nights`) })}
                  {@render knob(["comet", "speed"], "Speed", "How fast a comet crosses. Its tail and head grow with its speed.", { min: 0.3, max: 3, step: 0.05, format: times })}
                  {@render knob(["comet", "size"], "Head", "How big the comet's head is.", { min: 0.5, max: 2.5, step: 0.05, format: times })}
                  {@render knob(["comet", "tail"], "Tail", "How long the tail is for the speed the comet has.", { min: 0.3, max: 3, step: 0.05, format: times })}
                  <div class="flex" use:hinted={"Sends a comet across the sky now, whatever the night's chance says."}>{@render action("Send one", () => send("comet"), !dark)}</div>
                {/if}
              </section>
              <section class={ui.group} aria-label="All events">
                <h3 class={ui.heading}>All events</h3>
                <p class={ui.hint}>Events start at times drawn from the day, so everyone in a lobby sees the same ones. The buttons send one more, for you alone.</p>
                <div class="flex" use:hinted={"Ends every shooting star, shower, satellite and aurora that is up now."}>
                  {@render action("Clear the sky", () => starStage.clear())}
                </div>
              </section>
            {:else if pane === "figures"}
              <section class={ui.group} aria-label="Constellations">
                <div class="flex items-baseline justify-between gap-2">
                  <h3 class={ui.heading}>Constellations</h3>
                  <span class="font-mono text-xs text-foreground-darker">{S.constellations.shown.length} of {FIGURES.length}</span>
                </div>
                <p class="{ui.hint} max-sm:hidden">Pick the ones to set among the stars. Each keeps its true shape and turns with the sky.</p>
                <div class="grid grid-cols-4 gap-1.5 max-sm:grid-cols-3" role="group" aria-label="Constellations to show" use:hinted={"Pick a constellation to set it in the sky; pick it again to take it out."}>
                  {#each FIGURES as f (f.key)}
                    {@const on = S.constellations.shown.includes(f.key)}
                    <Button
                      unstyled
                      aria-pressed={on}
                      class="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary {on
                        ? 'border-secondary bg-secondary text-background'
                        : 'border-secondary/25 text-foreground hover:bg-secondary/10'}"
                      onclick={() => toggleFigure(f.key)}
                    >
                      <svg viewBox="-0.1 -0.1 1.2 1.2" class="w-full max-w-16" aria-hidden="true">
                        {#each f.lines as [a, b], i (i)}
                          <line x1={f.stars[a]?.[0]} y1={f.stars[a]?.[1]} x2={f.stars[b]?.[0]} y2={f.stars[b]?.[1]} stroke="currentColor" stroke-width="0.012" opacity="0.45" />
                        {/each}
                        {#each f.stars as [x, y, size], i (i)}
                          <circle cx={x} cy={y} r={0.022 + size * 0.03} fill="currentColor" />
                        {/each}
                      </svg>
                      <span class="font-mono text-xs leading-none">{f.name}</span>
                    </Button>
                  {/each}
                </div>
              </section>
              <section class={ui.group} aria-label="Shown as">
                <h3 class={ui.heading}>Shown as</h3>
                <div use:hinted={"On: thin lines join each constellation's stars, as on a star map."}>
                  <SwitchField size="sm" label="Lines between the stars" checked={S.constellations.lines} onchange={(v) => setStarValue(["constellations", "lines"], "Lines between the stars", v)} />
                </div>
                <div use:hinted={"On: each constellation's name is written under it in the sky."}>
                  <SwitchField size="sm" label="Names in the sky" checked={S.constellations.names} onchange={(v) => setStarValue(["constellations", "names"], "Names in the sky", v)} />
                </div>
              </section>
            {/if}
          </div>
        {/snippet}
      </Tabs>
  </SkyPanel>
{/if}
