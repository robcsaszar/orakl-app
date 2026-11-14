<!--
  Flocks over the sky: sparse events (a skein of geese, a starling
  murmuration, wheeling gulls, a circling raptor) picked per sky phase by
  `lib/birds/phases.ts`. The simulation and drawing run in a worker on an
  OffscreenCanvas where the browser allows it (`lib/birds/sky.worker.ts`),
  else on the page (`lib/birds/runner.ts`); either way the loop steps at
  60 Hz and stops while the sky is empty. Nothing animates under
  `prefers-reduced-motion`. `?birds` on any URL opens a control panel.
-->
<script lang="ts">
import type { SkyPhase } from "@orakl/shared";
  import { onMount, untrack } from "svelte";
  import { current } from "@/lib/birds/current.svelte";
  import type { SkyDriver } from "@/lib/birds/driver";
  import { BirdRunner } from "@/lib/birds/runner";
  import { birdLab } from "@/lib/birds/lab.svelte";
  import { daySeed } from "@/lib/birds/seed";
  import { defaultBirdSettings } from "@/lib/birds/settings";
  import { WorkerRunner } from "@/lib/birds/worker-runner";
  import { cloudLab } from "@/lib/sky-clouds-lab.svelte";
  import { skyStrength } from "@/lib/sky-colours-lab.svelte";
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import { windFor } from "@/lib/sky-wind";

  let { timeOfDay = "noon" }: { timeOfDay?: SkyPhase } = $props();

  let canvas: HTMLCanvasElement;

  /** A worker-backed sky, or null where the page must run it. */
  function tryWorker(options: {
    width: number;
    height: number;
    phase: SkyPhase;
    small: boolean;
    seed: number;
    wind: [number, number];
  }): WorkerRunner | null {
    if (
      typeof Worker === "undefined" ||
      typeof canvas.transferControlToOffscreen !== "function"
    ) {
      return null;
    }
    try {
      const worker = new Worker(
        new URL("../birds/sky.worker.ts", import.meta.url),
        { type: "module" },
      );
      return new WorkerRunner(canvas, worker, options);
    } catch {
      return null;
    }
  }

  /** The part of the viewport the flocks fly in: the top of it while a panel holds the bottom. */
  const share = $derived(cloudLab.skyShare);

  // The bird controls' tables while the panel is up, the code's own after it goes.
  let lent = false;
  $effect(() => {
    const sky = current.runner;
    if (!sky) return;
    if (birdLab.active) {
      // A dragged slider changes the tables many times a frame; the sky takes the last.
      const tables = $state.snapshot(birdLab.settings);
      const queued = requestAnimationFrame(() => sky.setSettings(tables));
      lent = true;
      return () => cancelAnimationFrame(queued);
    }
    if (lent) {
      sky.setSettings(defaultBirdSettings());
      lent = false;
    }
  });

  $effect(() => {
    current.runner?.resize(globalThis.innerWidth, globalThis.innerHeight * share);
  });

  let livePhase = $state(untrack(() => timeOfDay));
  const opacity = $derived(skyStrength(livePhase).birds);
  /** Whether the tab shows and motion is wanted; the sky also needs birds that can be seen. */
  let awake = $state(false);
  // Birds at a strength of nothing are not flown or drawn.
  $effect(() => {
    const sky = current.runner as (SkyDriver & { setAllowed(allowed: boolean): void }) | null;
    if (!sky) return;
    const on = awake && opacity > 0;
    sky.setAllowed(on);
    if (on) sky.resume();
    else if (opacity > 0) sky.draw();
  });

  onMount(() => {
    // Everyone on the same date shares the seed, so a lobby sees one sky.
    const seed = daySeed(new Date());
    const w0 = windFor(seed, timeOfDay);
    const options = {
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
      small: globalThis.innerWidth < 640,
      phase: timeOfDay,
      seed,
      wind: [w0.x, w0.z] as [number, number],
    };
    let runner: (SkyDriver & { setAllowed(allowed: boolean): void }) | null =
      tryWorker(options);
    if (!runner) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      runner = new BirdRunner(
        canvas,
        ctx,
        options,
      );
      runner.resize(options.width, options.height);
    }
    const sky = runner;
    current.runner = sky;

    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    const allowed = () => !document.hidden && !reducedMotion?.matches;
    const sync = () => {
      awake = allowed();
    };

    sync();

    const unsubscribePhase = subscribeSkyPhase((phase) => {
      const w = windFor(seed, phase);
      sky.setWind(w.x, w.z);
      sky.setPhase(phase);
      livePhase = phase;
    });
    const listeners = new AbortController();
    const { signal } = listeners;
    reducedMotion?.addEventListener("change", sync, { signal });
    document.addEventListener("visibilitychange", sync, { signal });

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(
        () => sky.resize(globalThis.innerWidth, globalThis.innerHeight * cloudLab.skyShare),
        100,
      );
    };
    globalThis.addEventListener("resize", onResize, { signal });

    return () => {
      sky.dispose();
      if (current.runner === sky) current.runner = null;
      clearTimeout(resizeTimer);
      listeners.abort();
      unsubscribePhase();
    };
  });
</script>

<canvas
  id="birds"
  bind:this={canvas}
  class="rr-block absolute inset-x-0 top-0 z-20 w-full pointer-events-none"
  style={`height: ${share * 100}%; opacity: ${opacity};${opacity > 0 ? "" : " visibility: hidden;"}`}
  aria-hidden="true"
></canvas>
