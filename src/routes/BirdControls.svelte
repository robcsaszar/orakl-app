<!--
  Control panel for the sky flocks, shown when the URL carries `?birds`.
  Drives the mounted `BirdRunner` (published by `Birds.svelte`): sky phase,
  phase schedule on/off, manual spawns at a chosen size and depth, time
  scale, pause, clear, and live counts. While it is open a line at the
  top-left says what is in the sky, one short sentence per event.
-->
<script lang="ts">
import { SKY_PHASES } from "@orakl/shared";
import type { SkyPhase } from "@orakl/shared";
  import { onMount } from "svelte";
  import { current } from "@/lib/birds/current.svelte";
  import type { EventKind } from "@/lib/birds/event";
  import { MODIFIERS, type ModifierId } from "@/lib/birds/modifiers";
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import Button from "@/lib/components/ui/Button.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import Checkbox from "@/lib/components/ui/Checkbox.svelte";
  import Select from "@/lib/components/ui/Select.svelte";
  import SegmentedPicker from "@/lib/components/ui/SegmentedPicker.svelte";
  import Slider from "@/lib/components/ui/Slider.svelte";

  const KINDS: { key: EventKind; label: string }[] = [
    { key: "skein", label: "skein" },
    { key: "murmuration", label: "murmuration" },
    { key: "soar", label: "gulls" },
    { key: "raptor", label: "raptor" },
  ];
  const PHASES = SKY_PHASES.map((key) => ({ key, label: key }));

  let phase = $state<SkyPhase | null>(null);
  let auto = $state(true);
  let paused = $state(false);
  let speed = $state(1);
  let count = $state(21);
  let depth = $state(60);
  /** "roll" = from the phase table, "none" = plain, else one forced modifier. */
  let modifier = $state<"roll" | "none" | ModifierId>("roll");
  let sentences = $state<string[]>([]);
  let stats = $state({ events: 0, birds: 0, drawn: 0, ms: 0 });

  onMount(() => {
    const unsubscribe = subscribeSkyPhase((p) => (phase = p));
    const timer = setInterval(() => {
      const r = current.runner;
      if (!r) return;
      const s = r.stats;
      sentences = s.sentences;
      stats = { events: s.events, birds: s.birds, drawn: s.drawn, ms: s.ms };
    }, 250);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  });

  // The theme and the sky both follow this attribute (see lib/sky-phase.ts).
  function setPhase(p: SkyPhase) {
    document.documentElement.dataset.skyPhase = p;
  }

  let copied = $state(false);
  async function copySnapshot() {
    const r = current.runner;
    if (!r) return;
    const snap = await r.snapshot();
    const text = JSON.stringify(snap, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      console.info(text);
    }
  }

  function spawn(kind: EventKind) {
    const spec = { kind, weight: 1, count: [count, count] as [number, number], depth: [depth, depth] as [number, number], exact: true };
    const forced =
      modifier === "roll" ? undefined
      : modifier === "none" ? []
      : MODIFIERS.some((m) => m.id === modifier && m.kind === kind) ? [modifier]
      : [];
    current.runner?.spawn(spec, forced);
  }
</script>

{#snippet pill(o: { key: string; label: string })}{o.label}{/snippet}

{#if sentences.length > 0}
  <p
    class="pointer-events-none fixed left-4 top-[calc(var(--sticky-header-height,4rem)+0.75rem)] z-50 max-w-xs font-serif text-sm text-foreground drop-shadow-md"
    aria-live="polite"
  >
    {#each sentences as s (s)}<span class="block">{s}</span>{/each}
  </p>
{/if}

<Card
  padding="none"
  variant="ground"
  role="region"
  aria-label="Bird controls"
  class="fixed bottom-4 left-4 z-50 w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden border-warning/30 bg-background/95 shadow-2xl backdrop-blur-md"
>
  <div class="flex items-center justify-between border-b border-secondary/15 px-4 py-2.5">
    <span class="font-mono text-[10px] font-bold uppercase tracking-widest text-warning">Birds</span>
    <span class="font-mono text-[10px] text-foreground-darker tabular-nums" aria-live="polite">
      {stats.events} ev · {stats.birds} birds · {stats.drawn} drawn · {stats.ms.toFixed(1)} ms
    </span>
  </div>

  {#if current.runner}
    <div class="flex flex-col gap-3 px-4 py-3">
      <div>
        <p class="mb-1 font-mono text-[10px] text-foreground-darker">Sky phase</p>
        <SegmentedPicker
          options={PHASES}
          optionKey={(o) => o.key}
          selectedKey={phase}
          label="Sky phase"
          onSelect={(o) => setPhase(o.key)}
          variant="pill"
          class="flex-wrap gap-1"
          optionClass="px-2 py-0.5 font-mono text-[10px]"
          option={pill}
        />
      </div>

      <Checkbox
        id="birds-auto"
        size="sm"
        label="Phase schedule spawns events"
        checked={auto}
        onchange={() => {
          auto = !auto;
          current.runner?.setAuto(auto);
        }}
      />

      <Slider id="birds-count" size="sm" label="Flock size" min={1} max={2500} bind:value={count} />
      <Slider id="birds-depth" size="sm" label="Depth" min={16} max={260} step={2} bind:value={depth} format={(v) => `${v} m`} />
      <Slider
        id="birds-speed"
        size="sm"
        label="Time"
        min={0.25}
        max={4}
        step={0.25}
        bind:value={speed}
        format={(v) => `${v}×`}
        oninput={() => {
          if (current.runner) current.runner.speed = speed;
        }}
      />

      <Select id="birds-modifier" size="compact" label="Modifier" bind:value={modifier}>
        <option value="roll">Roll from phase</option>
        <option value="none">None</option>
        {#each MODIFIERS as m (m.id)}
          <option value={m.id}>{m.kind} · {m.label}</option>
        {/each}
      </Select>

      <div>
        <p class="mb-1 font-mono text-[10px] text-foreground-darker">Spawn</p>
        <div class="flex flex-wrap gap-1" role="group" aria-label="Spawn an event">
          {#each KINDS as k (k.key)}
            <Button variant="outline" intent="compact" radius="rounded" class="px-2 py-1 font-mono text-[10px] font-normal" onclick={() => spawn(k.key)}>
              {k.label}
            </Button>
          {/each}
        </div>
      </div>

      <div class="flex gap-1">
        <Button
          variant="outline"
          intent="compact"
          radius="rounded"
          behavior="toggle"
          data-state={paused ? "on" : "off"}
          aria-pressed={paused}
          class="px-2 py-1 font-mono text-[10px] font-normal"
          onclick={() => {
            paused = !paused;
            current.runner?.setPaused(paused);
          }}
        >
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="outline" intent="compact" radius="rounded" class="px-2 py-1 font-mono text-[10px] font-normal" onclick={() => current.runner?.clear()}>
          Clear sky
        </Button>
        <Button variant="outline" intent="compact" radius="rounded" class="px-2 py-1 font-mono text-[10px] font-normal" onclick={copySnapshot}>
          {copied ? "Copied" : "Copy snapshot"}
        </Button>
      </div>
    </div>
  {:else}
    <p class="px-4 py-3 font-mono text-[10px] text-foreground-darker">No sky mounted (sky feature off or reduced motion).</p>
  {/if}
</Card>
