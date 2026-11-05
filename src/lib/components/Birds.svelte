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
import { PHASE_CONFIG } from "@orakl/shared";
import type { SkyPhase } from "@orakl/shared";
  import { onMount } from "svelte";
  import { current } from "@/lib/birds/current.svelte";
  import type { SkyDriver } from "@/lib/birds/driver";
  import { BirdRunner } from "@/lib/birds/runner";
  import { daySeed } from "@/lib/birds/seed";
  import { WorkerRunner } from "@/lib/birds/worker-runner";
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import { windFor } from "@/lib/sky-wind";

  let { timeOfDay = "noon" }: { timeOfDay?: SkyPhase } = $props();

  let canvas: HTMLCanvasElement;
  /** Birds beyond the cloud layer: drawn behind the clouds. */
  let farCanvas: HTMLCanvasElement;

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
      return new WorkerRunner(canvas, farCanvas, worker, options);
    } catch {
      return null;
    }
  }

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
      const farCtx = farCanvas.getContext("2d");
      runner = new BirdRunner(
        canvas,
        ctx,
        options,
        farCtx ? { surface: farCanvas, ctx: farCtx } : null,
      );
      runner.resize(options.width, options.height);
    }
    const sky = runner;
    current.runner = sky;

    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    const allowed = () => !document.hidden && !reducedMotion?.matches;
    const sync = () => {
      sky.setAllowed(allowed());
      if (allowed()) sky.resume();
      else sky.draw();
    };

    canvas.style.opacity = String(PHASE_CONFIG[timeOfDay].birdOpacity);
    farCanvas.style.opacity = canvas.style.opacity;
    sync();

    const unsubscribePhase = subscribeSkyPhase((phase) => {
      const w = windFor(seed, phase);
      sky.setWind(w.x, w.z);
      sky.setPhase(phase);
      const opacity = String(PHASE_CONFIG[phase].birdOpacity);
      canvas.style.opacity = opacity;
      farCanvas.style.opacity = opacity;
    });
    const listeners = new AbortController();
    const { signal } = listeners;
    reducedMotion?.addEventListener("change", sync, { signal });
    document.addEventListener("visibilitychange", sync, { signal });

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(
        () => sky.resize(globalThis.innerWidth, globalThis.innerHeight),
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
  id="birds-far"
  bind:this={farCanvas}
  class="rr-block absolute inset-0 z-[5] h-full w-full pointer-events-none"
  aria-hidden="true"
></canvas>
<canvas
  id="birds"
  bind:this={canvas}
  class="rr-block absolute inset-0 z-20 h-full w-full pointer-events-none"
  aria-hidden="true"
></canvas>
