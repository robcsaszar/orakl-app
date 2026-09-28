<script lang="ts">
import { PHASE_CONFIG } from "@orakl/shared";
import type { SkyPhase } from "@orakl/shared";
  import { onMount } from "svelte";
  import { PHASE_STOPS } from "@/lib/constants/phase-stops.constants";

  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import cloudsImgUrl from "@/assets/clouds.png";

  type TimeOfDay = SkyPhase;

  interface Props {
    timeOfDay?: TimeOfDay;
    windSpeed?: number;
    cloudOpacity?: number;
    driftX?: number;
    driftY?: number;
    rotationSpeed?: number;
  }

  let {
    timeOfDay = "noon",
    windSpeed = 1,
    cloudOpacity = 0.55,
    driftX = -0.04,
    driftY = 0.02,
    rotationSpeed = 0.00004,
  }: Props = $props();

  const initialStops = $derived(PHASE_STOPS[timeOfDay] ?? PHASE_STOPS.noon);

  const durations = $derived([90, 120, 105, 140].map((d) => d / windSpeed));
  const clouds = $derived([
    { top: "6.8%", rot: 1.3, width: "52%", opacity: cloudOpacity * 1.1, flip: 1, dur: durations[0], delay: -28.0 },
    { top: "20.1%", rot: -2.3, width: "38%", opacity: cloudOpacity * 0.8, flip: -1, dur: durations[1], delay: -71.5 },
    { top: "32.4%", rot: 3.1, width: "62%", opacity: cloudOpacity * 0.65, flip: 1, dur: durations[2], delay: -44.0 },
    { top: "11.5%", rot: -1.7, width: "44%", opacity: cloudOpacity * 0.9, flip: -1, dur: durations[3], delay: -88.0 },
  ]);

  let canvas: HTMLCanvasElement;
  let fireflyCanvas: HTMLCanvasElement;

  function isSkyPhaseKey(value: string): value is keyof typeof PHASE_STOPS {
    return value in PHASE_STOPS;
  }

  function updateGradient(phase: keyof typeof PHASE_STOPS) {
    const stops = PHASE_STOPS[phase];
    document.querySelectorAll("#grad-sky stop").forEach((el, i) => {
      (el as SVGStopElement).style.stopColor = stops[i] ?? "";
    });
  }

  onMount(() => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const ffctx = fireflyCanvas.getContext("2d") as CanvasRenderingContext2D;

    const NUM_STARS = 200;
    const DRIFT_X = driftX;
    const DRIFT_Y = driftY;
    const ROTATION_SPEED = rotationSpeed;

    let currentPhase: SkyPhase = timeOfDay;
    const maxFireflyCount = Math.max(...Object.values(PHASE_CONFIG).map((c) => c.fireflyCount));
    const NUM_FIREFLIES = Math.round((globalThis.innerWidth < 640 ? 0.5 : 1) * maxFireflyCount);
    let firefliesAlpha = PHASE_CONFIG[timeOfDay].fireflyCount > 0 ? 1 : 0;
    let ffWasActive = false;

    let rotationCenterX = canvas.width / 2;
    let rotationCenterY = -canvas.height * 0.3;

    interface Star {
      radius: number;
      x: number;
      y: number;
      color: string;
    }

    function rand(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    function resize() {
      canvas.width = globalThis.innerWidth;
      canvas.height = globalThis.innerHeight;
      fireflyCanvas.width = canvas.width;
      fireflyCanvas.height = canvas.height;
      rotationCenterX = canvas.width / 2;
      rotationCenterY = -canvas.height * 0.3;
      fireflies = createFireflies();
    }

    function createStars(): Star[] {
      const stars: Star[] = [];
      for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
          radius: rand(0.2, 1.5),
          x: rand(0, canvas.width),
          y: rand(0, canvas.height),
          color: `rgba(255,255,255,${rand(0.1, 1)})`,
        });
      }
      return stars;
    }

    function wrapStar(s: Star) {
      if (s.x > canvas.width + s.radius) s.x = -s.radius;
      else if (s.x < -s.radius) s.x = canvas.width + s.radius;
      if (s.y > canvas.height + s.radius) s.y = -s.radius;
      else if (s.y < -s.radius) s.y = canvas.height + s.radius;
    }

    // ── Fireflies (sunset only) ───────────────────────────────────────────
    interface Firefly {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      blinkPhase: number;
      blinkSpeed: number;
      baseBright: number;
    }

    let fireflies: Firefly[] = [];

    function createFireflies(): Firefly[] {
      const arr: Firefly[] = [];
      for (let i = 0; i < NUM_FIREFLIES; i++) {
        arr.push({
          x: rand(0, canvas.width),
          // Drift in the lower band — fireflies haunt the ground at dusk.
          y: rand(canvas.height * 0.45, canvas.height * 0.95),
          vx: rand(-0.15, 0.15),
          vy: rand(-0.1, 0.1),
          size: rand(0.6, 1.5),
          blinkPhase: rand(0, Math.PI * 2),
          blinkSpeed: rand(0.02, 0.05),
          baseBright: rand(0.55, 1),
        });
      }
      return arr;
    }

    // Pre-rendered warm glow sprite — drawn per firefly with globalAlpha, so no
    // per-frame radial gradient allocation.
    function makeGlowSprite(): HTMLCanvasElement {
      const s = 32;
      const c = document.createElement("canvas");
      c.width = s;
      c.height = s;
      const g = c.getContext("2d") as CanvasRenderingContext2D;
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, "rgba(225,255,150,1)");
      grad.addColorStop(0.35, "rgba(190,240,110,0.55)");
      grad.addColorStop(1, "rgba(160,220,90,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      return c;
    }
    const glowSprite = makeGlowSprite();

    interface ShootingStar {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      length: number;
      brightness: number;
    }

    let shootingStars: ShootingStar[] = [];

    function spawnShootingStar() {
      const baseAngle = Math.atan2(DRIFT_Y, DRIFT_X);
      const angle = baseAngle + rand(-0.4, 0.4);
      const speed = rand(6, 12) / Math.cos(angle - baseAngle);
      shootingStars.push({
        x: rand(0, canvas.width * 0.7),
        y: rand(0, canvas.height * 0.4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: rand(40, 70),
        length: rand(80, 160),
        brightness: rand(0.6, 1.0),
      });
    }

    let shootingStarTimer: ReturnType<typeof setTimeout>;

    function scheduleShootingStar() {
      shootingStarTimer = setTimeout(() => {
        spawnShootingStar();
        scheduleShootingStar();
      }, rand(2000, 10000));
    }

    scheduleShootingStar();

    resize();
    const stars = createStars();

    let _bgResizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(_bgResizeTimer);
      _bgResizeTimer = setTimeout(resize, 100);
    };
    const onOrientationChange = () => resize();
    globalThis.addEventListener("resize", onResize);
    globalThis.addEventListener("orientationchange", onOrientationChange);

    let animFrameId: number;
    let running = false;
    let lastTs = 0;

    function animate(ts: number) {
      // running is authoritative: bail if stopped so a stale frame can't
      // resurrect the loop after stopAnim().
      if (!running) return;

      // Frame-rate independent: scale motion to a 60fps step, clamped so a
      // hitch or background tab can't fling the stars across the sky.
      const dt = lastTs ? Math.min(2, Math.max(0, (ts - lastTs) / 16.667)) : 1;
      lastTs = ts;

      if (getComputedStyle(canvas).display === "none") {
        if (running) animFrameId = requestAnimationFrame(animate);
        return;
      }

      const rotCos = Math.cos(ROTATION_SPEED * dt);
      const rotSin = Math.sin(ROTATION_SPEED * dt);
      const driftX = DRIFT_X * dt;
      const driftY = DRIFT_Y * dt;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const dx = s.x - rotationCenterX;
        const dy = s.y - rotationCenterY;
        s.x = rotationCenterX + dx * rotCos - dy * rotSin + driftX;
        s.y = rotationCenterY + dx * rotSin + dy * rotCos + driftY;
        wrapStar(s);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx * dt;
        ss.y += ss.vy * dt;
        ss.life += dt;

        const opacity = (1 - ss.life / ss.maxLife) * ss.brightness;
        const tailX = ss.x - (ss.vx / Math.hypot(ss.vx, ss.vy)) * ss.length;
        const tailY = ss.y - (ss.vy / Math.hypot(ss.vx, ss.vy)) * ss.length;

        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 1 + ss.brightness * 0.5, 0, Math.PI * 2);
        ctx.fill();

        const segments = 5;
        for (let j = 0; j < segments; j++) {
          const t1 = j / segments;
          const t2 = (j + 1) / segments;
          const x1 = tailX + (ss.x - tailX) * t1;
          const y1 = tailY + (ss.y - tailY) * t1;
          const x2 = tailX + (ss.x - tailX) * t2;
          const y2 = tailY + (ss.y - tailY) * t2;

          const segmentOpacity = opacity * (0.2 + t2 * 0.8);
          const lineWidth = (0.3 + t2 * 0.9) * ss.brightness;

          ctx.strokeStyle = `rgba(255,255,255,${segmentOpacity})`;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        if (ss.life >= ss.maxLife) {
          shootingStars.splice(i, 1);
        }
      }

      // Fireflies — ease in/out per PHASE_CONFIG.fireflyCount.
      const ffTarget = PHASE_CONFIG[currentPhase].fireflyCount > 0 ? 1 : 0;
      firefliesAlpha += (ffTarget - firefliesAlpha) * Math.min(1, 0.015 * dt);
      if (firefliesAlpha > 0.01) {
        const vh = fireflyCanvas.height;
        ffctx.clearRect(0, 0, fireflyCanvas.width, vh);
        ffctx.globalCompositeOperation = "lighter";
        for (const f of fireflies) {
          f.vx += (Math.random() - 0.5) * 0.02 * dt;
          f.vy += (Math.random() - 0.5) * 0.015 * dt;
          f.vx = Math.max(-0.35, Math.min(0.35, f.vx));
          f.vy = Math.max(-0.25, Math.min(0.25, f.vy));
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.blinkPhase += f.blinkSpeed * dt;
          if (f.x < -20) f.x = fireflyCanvas.width + 20;
          else if (f.x > fireflyCanvas.width + 20) f.x = -20;
          if (f.y < vh * 0.35) {
            f.y = vh * 0.35;
            f.vy = Math.abs(f.vy);
          } else if (f.y > vh) {
            f.y = vh;
            f.vy = -Math.abs(f.vy);
          }
          // Sharp pulse (mostly dim, brief glow) + fade higher up.
          const t = Math.sin(f.blinkPhase) * 0.5 + 0.5;
          const vFade = 0.3 + 0.7 * Math.min(1, (f.y / vh - 0.35) / 0.65);
          const bright = f.baseBright * t * t * vFade * firefliesAlpha;
          if (bright <= 0.01) continue;
          ffctx.globalAlpha = bright;
          const sz = 16 * f.size;
          ffctx.drawImage(glowSprite, f.x - sz / 2, f.y - sz / 2, sz, sz);
        }
        ffctx.globalAlpha = 1;
        ffctx.globalCompositeOperation = "source-over";
        ffWasActive = true;
      } else if (ffWasActive) {
        ffctx.clearRect(0, 0, fireflyCanvas.width, fireflyCanvas.height);
        ffWasActive = false;
      }

      if (running) animFrameId = requestAnimationFrame(animate);
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

    startAnim();

    // Set initial star opacity from config.
    canvas.style.opacity = String(PHASE_CONFIG[timeOfDay].starOpacity);

    const unsubscribePhase = subscribeSkyPhase((phase) => {
      currentPhase = phase;
      if (isSkyPhaseKey(phase)) updateGradient(phase);
      canvas.style.opacity = String(PHASE_CONFIG[phase].starOpacity);
    });

    const onVisibilityChange = () => {
      const playState = document.hidden ? "paused" : "running";
      for (const el of document.querySelectorAll<HTMLElement>(".sky-cloud")) {
        el.style.animationPlayState = playState;
      }
      if (document.hidden) {
        stopAnim();
        clearTimeout(shootingStarTimer);
      } else {
        shootingStars = [];
        scheduleShootingStar();
        startAnim();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(animFrameId);
      clearTimeout(shootingStarTimer);
      clearTimeout(_bgResizeTimer);
      globalThis.removeEventListener("resize", onResize);
      globalThis.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
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
        <stop offset="0%" style={`stop-color: ${initialStops[0]}`}></stop>
        <stop offset="22%" style={`stop-color: ${initialStops[1]}`}></stop>
        <stop offset="50%" style={`stop-color: ${initialStops[2]}`}></stop>
        <stop offset="79%" style={`stop-color: ${initialStops[3]}`}></stop>
        <stop offset="88%" style={`stop-color: ${initialStops[4]}`}></stop>
        <stop offset="100%" style={`stop-color: ${initialStops[5]}`}></stop>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad-sky)"></rect>
  </svg>
  {#each clouds as c}
    <img
      src={cloudsImgUrl}
      width={400}
      height={300}
      class="sky-cloud absolute select-none pointer-events-none"
      style={`top: ${c.top}; width: ${c.width}; opacity: ${c.opacity.toFixed(3)}; rotate: ${c.rot.toFixed(2)}deg; --flip: ${c.flip}; --dur: ${c.dur?.toFixed(1)}s; --delay: ${c.delay.toFixed(1)}s;`}
      alt=""
      draggable="false"
      loading="eager"
    />
  {/each}
</div>

<canvas
  id="stars"
  bind:this={canvas}
  class="rr-block absolute inset-0 z-10 h-full w-full pointer-events-none mask-b-from-50% mask-radial-[50%_90%] mask-radial-from-80%"
  aria-hidden="true"
></canvas>

<canvas
  id="fireflies"
  bind:this={fireflyCanvas}
  class="rr-block absolute inset-0 z-10 h-full w-full pointer-events-none"
  aria-hidden="true"
></canvas>

<style>
  #grad-sky stop {
    transition: stop-color 2s ease;
  }

  @keyframes sky-drift {
    from {
      transform: translateX(110vw) scaleX(var(--flip, 1));
    }
    to {
      transform: translateX(-110%) scaleX(var(--flip, 1));
    }
  }

  .sky-cloud {
    animation: sky-drift linear infinite;
    animation-duration: var(--dur, 100s);
    animation-delay: var(--delay, 0s);
    will-change: transform;
    transition: opacity 2s ease;
  }

  :global(html[data-sky-phase="night"]) .sky-cloud {
    opacity: 0 !important;
  }
</style>
