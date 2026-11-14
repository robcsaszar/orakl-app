<script lang="ts">
import type { SkyPhase } from "@orakl/shared";
  import { onMount, tick, untrack } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { Tween } from "svelte/motion";
  import { PHASE_STOPS } from "@/lib/constants/phase-stops.constants";
  import { skyLab, skyStops, skyStrength, skyTint } from "@/lib/sky-colours-lab.svelte";

  import { fade } from "svelte/transition";
  import {
    CLOUD_LIVE,
    CLOUD_SETTINGS,
    CloudPainter,
    type CloudMotion,
    type SkyCloud,
    carryProgress,
    cloudMotion,
    cloudsInSky,
    drawCloud,
    CLOUD_TOP_SHIFT,
    skyClouds,
  } from "@/lib/sky-clouds";
  import { mulberry32 } from "@/lib/birds/rng";
  import { mix } from "@/lib/birds/seed";
  import { cloudLab, cloudStage, setCloudProgress } from "@/lib/sky-clouds-lab.svelte";
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import { StarField, type StarSettings } from "@/lib/sky-stars";
  import { starLab, starSettings, starStage } from "@/lib/sky-stars-lab.svelte";
  import type { SkyWind } from "@/lib/sky-wind";

  type TimeOfDay = SkyPhase;

  interface Props {
    timeOfDay?: TimeOfDay;
    /** The sky's wind; sets cloud direction, pace, stretch and lift. */
    wind?: SkyWind;
    /** The day's seed; lays the clouds out the same for everyone on the day. */
    seed?: number;
  }

  let {
    timeOfDay = "noon",
    wind = { x: 1, z: 0 },
    seed = 0,
  }: Props = $props();

  const initialStops = $derived(skyStops(timeOfDay in PHASE_STOPS ? timeOfDay : "noon"));
  // `offset` is an SVG attribute CSS cannot transition, so it tweens over the
  // same 2 s as the stop colours. Empty until mount; the template falls back.
  const offsets = new Tween<number[]>([], { duration: 2000, easing: cubicOut });

  // The day's clouds, or the cloud controls' while that panel is open. Laid out
  // once for the day: a phase change retunes the wind and the tint, moves nothing.
  const settings = $derived(cloudLab.active ? cloudLab.settings : CLOUD_SETTINGS);
  const daySeed = $derived(cloudLab.active && cloudLab.daySeed !== null ? cloudLab.daySeed : seed);
  // Every design of the pool on a path of its own, and second showings where the sky needs more clouds than there are designs.
  const clouds = $derived(skyClouds(daySeed, settings, true));
  const motion = $derived.by(() => {
    const m = cloudMotion(cloudLab.active && cloudLab.wind !== null ? { x: cloudLab.wind, z: wind.z } : wind);
    // Watched sped up from the controls, the drift runs that much faster too.
    return { ...m, pace: m.pace * settings.speed * (cloudLab.active ? cloudLab.rate : 1) };
  });
  /** How many clouds the sky holds now. */
  const wanted = $derived(cloudsInSky(timeOfDay, daySeed, settings));
  /** The clouds in the sky now, by id: the rest of the pool waits out of sight. */
  let inSky = $state<number[]>([]);
  /** How far each cloud in the sky sits from its own height, percent of the sky. */
  let shift = $state<Record<number, number>>({});
  let draws = 0;
  /** When each cloud was last put in its place, ms. */
  const placed = new Map<number, number>();
  const PLACING_MS = 1000;
  /** A random number for the next draw, from the day's seed, so the order of clouds is the day's. */
  const roll = () => mulberry32(mix(daySeed, 0xad17, draws++)).next();
  /** Brings one more cloud into the sky, drawn by rarity, and puts it `at` a share of its crossing: 0 is the edge it comes in at. */
  function admit(at = 0) {
    const here = clouds.filter((c) => inSky.includes(c.id));
    const next = drawCloud(
      clouds.filter((c) => !inSky.includes(c.id)),
      timeOfDay,
      here,
      roll(),
    );
    if (!next) return false;
    inSky = [...inSky, next.id];
    shift = { ...shift, [next.id]: (roll() * 2 - 1) * CLOUD_TOP_SHIFT };
    placed.set(next.id, performance.now());
    tick().then(() => setCloudProgress(next.id, at));
    return true;
  }
  // Keeps the sky at the number wanted: a cloud that is no more goes, missing ones are drawn, extra ones leave.
  $effect(() => {
    const ids = new Set(clouds.map((c) => c.id));
    const want = wanted;
    void timeOfDay;
    untrack(() => {
      inSky = inSky.filter((id) => ids.has(id)).slice(0, want);
      // A sky that needs more clouds at once, on a first visit or at a new time of day, finds them spread across it; they do not all come in at one edge.
      while (inSky.length < want && admit(0.08 + roll() * 0.84)) {}
    });
  });
  /** A cloud has crossed the sky: the next one is drawn, which may be the same again. */
  function crossed(id: number) {
    // Putting a cloud in its place can itself end a crossing on the clock: that is no crossing of the sky.
    if (!inSky.includes(id) || performance.now() - (placed.get(id) ?? -PLACING_MS) < PLACING_MS) return;
    inSky = inSky.filter((x) => x !== id);
    if (inSky.length < wanted) admit();
  }
  /** A cloud shows while it is in the sky; while one is being changed, only that one shows. */
  const visible = (c: SkyCloud) =>
    cloudLab.active && cloudLab.editing >= 0 ? c.id === cloudLab.editing : inSky.includes(c.id);
  /** The smallest strength a cloud is still drawn at. */
  const FAINTEST = 0.004;
  /** How far apart a phone's cloud repaints are, at the least, ms: each one is a long task there. */
  const SMALL_INTERVAL = 1200;
  /** A cloud's canvas width on a small screen, where it shows at a fraction of the full size. */
  const SMALL_WIDTH = 512;
  let tint = untrack(() => skyTint(timeOfDay));
  /** The phase in the sky now; the sky colour controls' edits to it show at once. */
  let livePhase = $state(untrack(() => timeOfDay));
  const paused = $derived(cloudLab.active && cloudLab.paused);
  const strength = $derived(skyStrength(livePhase));
  /** How strongly a cloud is drawn; 0 when it cannot be seen. Night shows no clouds. */
  const drawn = (c: SkyCloud) =>
    visible(c) && livePhase !== "night" ? settings.opacity * strength.clouds * c.opacity * motion.thin : 0;
  /** The clouds that can be seen: only these repaint, drift and breathe. */
  const liveIds = $derived(new Set(clouds.filter((c) => drawn(c) >= FAINTEST).map((c) => c.id)));

  $effect.pre(() => {
    cloudStage.clouds = clouds;
    cloudStage.live = liveIds;
    cloudStage.motion = motion;
  });

  /** Registers a cloud's drifting element for the paint loop and the controls. */
  function drifting(el: HTMLElement, id: number) {
    cloudStage.els.set(id, el);
    return { destroy: () => void cloudStage.els.delete(id) };
  }

  /** One painter per canvas; a new silhouette seed is a new canvas. */
  function painted(el: HTMLCanvasElement, c: SkyCloud) {
    const painter = new CloudPainter(el, c.seed, globalThis.innerWidth < 640 ? SMALL_WIDTH : undefined);
    cloudStage.painters.set(c.id, painter);
    cloudStage.repaint(c.id);
    return {
      destroy: () => {
        if (cloudStage.painters.get(c.id) === painter) cloudStage.painters.delete(c.id);
      },
    };
  }

  // A new pace or direction would retime the running crossings; carry each
  // cloud's progress over so it keeps its place and only its speed changes.
  let lastMotion: CloudMotion | undefined;
  $effect.pre(() => {
    const next = motion;
    const prev = lastMotion;
    lastMotion = next;
    if (!prev || (prev.pace === next.pace && prev.dir === next.dir)) return;
    const at = new Map([...cloudStage.els].map(([id, el]) => [id, el.getAnimations()[0]?.currentTime]));
    tick().then(() => {
      for (const cloud of cloudStage.clouds) {
        const t = at.get(cloud.id);
        const anim = cloudStage.els.get(cloud.id)?.getAnimations()[0];
        if (typeof t !== "number" || !anim) continue;
        anim.currentTime = carryProgress(cloud, t / 1000, prev, next) * 1000;
      }
    });
  });

  let canvas: HTMLCanvasElement;

  function isSkyPhaseKey(value: string): value is keyof typeof PHASE_STOPS {
    return value in PHASE_STOPS;
  }

  function updateGradient(phase: keyof typeof PHASE_STOPS) {
    const { offsets: phaseOffsets, colors } = skyStops(phase);
    document.querySelectorAll("#grad-sky stop").forEach((el, i) => {
      (el as SVGStopElement).style.stopColor = colors[i] ?? "";
    });
    offsets.target = [...phaseOffsets];
  }

  // A colour changed in the sky colour controls shows without the phase fade.
  $effect(() => {
    const stops = skyStops(livePhase);
    const next = skyTint(livePhase);
    const live = skyLab.active;
    void JSON.stringify([stops, next]);
    untrack(() => {
      document.querySelectorAll<SVGStopElement>("#grad-sky stop").forEach((el, i) => {
        el.style.transition = live ? "none" : "";
        el.style.stopColor = stops.colors[i] ?? "";
      });
      offsets.set([...stops.offsets], live ? { duration: 0 } : undefined);
      tint = next;
      cloudStage.repaint();
    });
  });

  /** Set on mount: tells the star loop whether the stars can be seen. */
  let showStars: (on: boolean) => void = () => {};
  $effect(() => {
    if (!canvas) return;
    canvas.style.opacity = String(strength.stars);
    showStars(strength.stars > 0);
  });

  /** Set on mount: hands the star field new settings, and starts or holds it. */
  let applyStars: (next: StarSettings) => void = () => {};
  let holdStars: () => void = () => {};
  $effect(() => {
    const next = $state.snapshot(starSettings());
    untrack(() => applyStars(next));
  });
  $effect(() => {
    void (starLab.active && starLab.paused);
    untrack(() => holdStars());
  });

  /** Set on mount: wakes the cloud paint loop. */
  let wakeClouds: () => void = () => {};
  // A cloud that comes back into view is repainted at once, then keeps its turn.
  let wasLive = new Set<number>();
  $effect(() => {
    const now = liveIds;
    untrack(() => {
      for (const id of now) if (!wasLive.has(id)) cloudStage.repaint(id);
      wasLive = now;
      wakeClouds();
    });
  });

  onMount(() => {
    // Clouds paint in turn: at most one per frame, each when its interval is
    // up, its puffs a little further along the variation; still air under reduced motion.
    const stillAir = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The variation clock runs only while unpaused, so a pause holds every shape.
    // It lives on the stage so the cloud controls can read it and scrub it.
    let lastTick = performance.now();
    /** When each cloud was last painted, for its own tint easing. */
    const paintedAt = new Map<number, number>();
    const small = globalThis.innerWidth < 640;
    const rate = () => (cloudLab.active ? cloudLab.rate : 1);
    const paintCloud = (id: number, now = performance.now()) => {
      const painter = cloudStage.painters.get(id);
      const cloud = cloudStage.clouds.find((c) => c.id === id);
      if (!painter || !cloud) return;
      const s = cloudLab.active ? cloudLab.settings : CLOUD_SETTINGS;
      const live = {
        ...CLOUD_LIVE,
        variation: stillAir ? 0 : s.variation,
        variationPeriod: s.variationPeriod,
        interval: s.interval,
      };
      const t = stillAir ? 0 : (cloudStage.clock / 1000) * ((2 * Math.PI) / live.variationPeriod);
      const cells = cloudLab.active && cloudLab.bare && id === cloudLab.editing ? undefined : cloud.paint;
      painter.paint(t, tint, (now - (paintedAt.get(id) ?? 0)) / 1000, cloud.model, live, cells, cloud.hardness);
      // A fast-forwarded preview needs frames close together to read as motion.
      const interval =
        rate() > 1 ? Math.min(live.interval, 60) : small && !cloudLab.active ? Math.max(live.interval, SMALL_INTERVAL) : live.interval;
      painter.nextAt = now + interval * (0.9 + 0.2 * Math.random());
      paintedAt.set(id, now);
      for (const listener of cloudStage.painted) listener(id);
    };
    cloudStage.repaint = (id) => {
      if (id === undefined) for (const key of cloudStage.painters.keys()) paintCloud(key);
      else paintCloud(id);
    };
    cloudStage.repaint();
    // The loop runs only while a cloud that can be seen has shapes to move:
    // not in a hidden tab, not at night, not in still air outside the controls.
    let paintFrame = 0;
    let painting = false;
    const shouldPaint = () => !document.hidden && liveIds.size > 0 && (!stillAir || cloudLab.active);
    const paintLoop = () => {
      if (!shouldPaint()) {
        painting = false;
        return;
      }
      paintFrame = requestAnimationFrame(paintLoop);
      const now = performance.now();
      const dt = now - lastTick;
      lastTick = now;
      // A pause holds the clouds' shapes as well as their drift; a preview of the
      // reshaping runs the shapes on while the drift stays held.
      if (cloudLab.active && cloudLab.paused && cloudLab.rate <= 1) return;
      cloudStage.clock += Math.min(dt, 100) * rate();
      for (const [id, painter] of cloudStage.painters) {
        if (now < painter.nextAt || !liveIds.has(id)) continue;
        paintCloud(id, now);
        break;
      }
    };
    wakeClouds = () => {
      if (painting || !shouldPaint()) return;
      painting = true;
      lastTick = performance.now();
      paintFrame = requestAnimationFrame(paintLoop);
    };
    wakeClouds();
    const field = new StarField(canvas.getContext("2d") as CanvasRenderingContext2D, seed);
    field.setSettings($state.snapshot(starSettings()));
    starStage.send = (kind) => {
      field.send(kind);
      syncStars();
    };
    starStage.clear = () => {
      field.clear();
      field.draw();
    };
    applyStars = (next) => {
      field.setSettings(next);
      if (!running) field.draw();
    };

    function resize() {
      // A phone's address bar fires resize as it slides; the same size is no work.
      if (canvas.width === globalThis.innerWidth && canvas.height === globalThis.innerHeight) return;
      canvas.width = globalThis.innerWidth;
      canvas.height = globalThis.innerHeight;
      field.resize(canvas.width, canvas.height);
      field.draw();
    }
    resize();

    let _bgResizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(_bgResizeTimer);
      _bgResizeTimer = setTimeout(resize, 100);
    };
    const onOrientationChange = () => resize();
    const listeners = new AbortController();
    const { signal } = listeners;
    globalThis.addEventListener("resize", onResize, { signal });
    globalThis.addEventListener("orientationchange", onOrientationChange, { signal });

    let animFrameId: number;
    let running = false;
    let lastTs = 0;
    /** The slow turn alone needs half the frames; an event or a flicker takes every one. */
    const CALM_FRAME_MS = 32;

    function animate(ts: number) {
      // running is authoritative: bail if stopped so a stale frame can't
      // resurrect the loop after stopAnim().
      if (!running) return;
      animFrameId = requestAnimationFrame(animate);
      if (!field.busy && lastTs && ts - lastTs < CALM_FRAME_MS) return;

      // Frame-rate independent: scale motion to a 60fps step, clamped so a
      // hitch or background tab can't fling the stars across the sky.
      const dt = lastTs ? Math.min(4, Math.max(0, (ts - lastTs) / 16.667)) : 1;
      lastTs = ts;
      const now = Date.now();
      field.rate = starSettings().eventRates?.[livePhase] ?? 1;
      field.step(dt, now);
      field.draw(now);
    }

    // Guarded start — never stack concurrent rAF loops (the prior visibility
    // re-arm could double the loop, climbing CPU on every tab switch).
    function startAnim() {
      if (running) return;
      running = true;
      lastTs = 0;
      animFrameId = requestAnimationFrame(animate);
    }
    function stopAnim() {
      running = false;
      cancelAnimationFrame(animFrameId);
    }

    // The stars move only while they can be seen: not at a strength of
    // nothing, not in a hidden tab, not while the controls hold them. Under
    // reduced motion they stand still.
    let starsShown = false;
    const syncStars = () => {
      if (starsShown && !document.hidden && !stillAir && !(starLab.active && starLab.paused)) startAnim();
      else {
        stopAnim();
        if (!starsShown || document.hidden) field.clear();
        if (starsShown) field.draw();
        else canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    holdStars = syncStars;
    showStars = (on) => {
      if (on === starsShown) return;
      starsShown = on;
      syncStars();
    };
    showStars(strength.stars > 0);

    offsets.set([...initialStops.offsets], { duration: 0 });

    const unsubscribePhase = subscribeSkyPhase((phase) => {
      livePhase = phase;
      tint = skyTint(phase);
      if (isSkyPhaseKey(phase)) updateGradient(phase);
    });

    const onVisibilityChange = () => {
      const playState = document.hidden || (cloudLab.active && cloudLab.paused) ? "paused" : "running";
      for (const el of document.querySelectorAll<HTMLElement>(".sky-cloud, .sky-cloud-body")) {
        el.style.animationPlayState = playState;
      }
      syncStars();
      wakeClouds();
    };
    document.addEventListener("visibilitychange", onVisibilityChange, { signal });

    return () => {
      cancelAnimationFrame(paintFrame);
      wakeClouds = () => {};
      showStars = () => {};
      applyStars = () => {};
      holdStars = () => {};
      starStage.send = () => {};
      starStage.clear = () => {};
      cloudStage.repaint = () => {};
      cancelAnimationFrame(animFrameId);
      clearTimeout(_bgResizeTimer);
      listeners.abort();
      unsubscribePhase();
    };
  });
</script>

<div
  class="sky absolute inset-0 z-0 h-full w-full overflow-hidden pointer-events-none"
  aria-hidden="true"
>
  <svg
    class="absolute inset-0 h-full w-full"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="grad-sky" x1="0" y1="0" x2="0" y2="1">
        {#each initialStops.colors as color, i}
          <stop offset="{offsets.current[i] ?? initialStops.offsets[i]}%" style={`stop-color: ${color}`}></stop>
        {/each}
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad-sky)"></rect>
  </svg>
</div>

<!-- Clouds sit below the birds: every bird flies in front of them. -->
<div
  class="absolute inset-x-0 top-0 z-[15] w-full overflow-hidden pointer-events-none"
  style={`height: ${(cloudLab.active ? cloudLab.skyShare : 1) * 100}%;`}
  aria-hidden="true"
>
  {#each clouds as c (c.id)}
    <div
      use:drifting={c.id}
      class="sky-cloud absolute left-0 select-none"
      class:sky-cloud-off={!liveIds.has(c.id)}
      onanimationiteration={(e) => e.target === e.currentTarget && crossed(c.id)}
      style={`top: ${(c.top + (shift[c.id] ?? 0)).toFixed(1)}%; width: ${c.width.toFixed(1)}%; aspect-ratio: ${c.model.aspect}; --dur: ${(c.dur / motion.pace).toFixed(1)}s; --delay: ${c.delay.toFixed(1)}s; --from: ${motion.dir > 0 ? "-110%" : "110vw"}; --to: ${motion.dir > 0 ? "110vw" : "-110%"}; --lift: ${c.lift.toFixed(1)}%;${paused ? " animation-play-state: paused;" : ""}`}
    >
      <div
        class="sky-cloud-body"
        transition:fade={{ duration: 1200 }}
        style={`opacity: ${drawn(c).toFixed(3)}; rotate: ${c.rot.toFixed(2)}deg; scale: ${(c.flip * motion.stretch).toFixed(3)} ${c.height.toFixed(2)}; --blur: ${c.blur > 0.3 ? `blur(${c.blur.toFixed(2)}px)` : "none"}; --delay: ${c.delay.toFixed(1)}s;${paused ? " animation-play-state: paused;" : ""}`}
      >
        {#key c.seed}
          <canvas use:painted={c} class="h-full w-full"></canvas>
        {/key}
      </div>
      {#if cloudLab.active && cloudLab.tags && drawn(c) >= FAINTEST}
        <span class="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-xs leading-none text-foreground">
          {c.name || `Cloud ${c.design + 1}`}
        </span>
      {/if}
    </div>
  {/each}
</div>

<canvas
  id="stars"
  bind:this={canvas}
  class="rr-block absolute inset-0 z-10 h-full w-full pointer-events-none mask-b-from-50% mask-radial-[50%_90%] mask-radial-from-80%"
  aria-hidden="true"
></canvas>

<style>
  #grad-sky stop {
    transition: stop-color 2s ease;
  }

  @keyframes sky-drift {
    from {
      transform: translate(var(--from, 110vw), 0);
    }
    to {
      transform: translate(var(--to, -110%), var(--lift, 0%));
    }
  }

  /* Clouds form and thin: a few percent of scale over minutes. */
  @keyframes sky-breathe {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.035);
    }
  }

  .sky-cloud {
    animation: sky-drift linear infinite;
    animation-duration: var(--dur, 100s);
    animation-delay: var(--delay, 0s);
    will-change: transform;
  }

  .sky-cloud-body {
    position: absolute;
    inset: 0;
    filter: var(--blur, none);
    animation: sky-breathe 110s ease-in-out infinite alternate;
    animation-delay: var(--delay, 0s);
    transition:
      opacity 2s ease,
      scale 2s ease;
  }

  :global(html[data-sky-phase="night"]) .sky-cloud-body {
    opacity: 0 !important;
  }

  /* A cloud that cannot be seen: faded out, then out of the compositor, its drift and breathing held. */
  .sky-cloud-off {
    animation-play-state: paused;
    will-change: auto;
  }
  .sky-cloud-off .sky-cloud-body {
    visibility: hidden;
    animation-play-state: paused;
    transition:
      opacity 2s ease,
      scale 2s ease,
      visibility 0s linear 2s;
  }
</style>
