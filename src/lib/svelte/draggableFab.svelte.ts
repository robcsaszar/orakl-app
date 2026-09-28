import { untrack } from "svelte";

const DRAG_THRESHOLD = 4; // px — below this, treat as a click, not a drag
const EDGE_MARGIN = 16;
const SETTLE_MS = 300;

// Same curve as the old `cubic-bezier(0.32,0.72,0,1)` CSS transition, but
// evaluated in JS so the post-drop "settle" animation can drive `transform`
// every frame itself — see the note on `_snapToEdge` for why this replaced
// a CSS transition entirely, not just a differently-sequenced one.
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  function solveXForT(x: number): number {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-4) return t;
      const d = sampleDerivX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-4) break;
      if (dx > 0) hi = t;
      else lo = t;
      t = (hi + lo) / 2;
    }
    return t;
  }

  return (x: number) => sampleY(solveXForT(x));
}

const SETTLE_EASE = cubicBezier(0.32, 0.72, 0, 1);

type Vec = { x: number; y: number };

/** Tweens `from` -> `to` over `duration`ms via `requestAnimationFrame`,
 *  calling `onUpdate` every frame and `onComplete` once at the end. Returns
 *  a cancel function. JS-driven (not a CSS transition) specifically so the
 *  animated value is always whatever the last `onUpdate` call set it to —
 *  there's no separate "arm the transition" step that a browser could ever
 *  misattribute to a stale earlier value (see `_snapToEdge`). */
function animateVector(
  from: Vec,
  to: Vec,
  duration: number,
  onUpdate: (v: Vec) => void,
  onComplete?: () => void,
) {
  const start = performance.now();
  let frame = requestAnimationFrame(tick);
  function tick(now: number) {
    const t = Math.min(1, (now - start) / duration);
    const e = SETTLE_EASE(t);
    onUpdate({
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e,
    });
    if (t < 1) frame = requestAnimationFrame(tick);
    else onComplete?.();
  }
  return () => cancelAnimationFrame(frame);
}

/**
 * Free-drag + edge-snap engine for a `position:fixed` FAB, shared by
 * DevToolbar and FeedbackWidget (previously two near-identical copies of
 * this pointer/snap/persist logic). One instance per FAB.
 *
 * Position model: `x`/`y` is the resting spot (changed only when a drag or
 * settle ends), `offsetX`/`offsetY` is the live delta on top of it (from an
 * active drag, or from the post-drop settle tween) — always applied via
 * `transform`, never `left`/`top`, and `left`/`top`'s CSS `transition` is
 * always `none`. Earlier versions animated the settle with a one-shot CSS
 * transition on `left`/`top` instead, toggling `transition` on in the same
 * update that first moved `left`/`top` to the drop point — which the browser
 * reads as "transition-property just changed AND `left` changed", so it
 * animated `left` from its *pre-drag* value, producing a visible flash back
 * to the old resting corner before the (separately, correctly) rAF'd snap.
 * Driving the whole settle through `transform` via JS instead (this file's
 * `animateVector`) removes the CSS transition engine from the picture
 * entirely, so there's no stale-value misattribution to guard against.
 *
 * `x`/`y` start `null` so a consumer can CSS-anchor the FAB to a corner
 * until the user's first drag — or call `restore()` with a fallback to
 * place it eagerly instead.
 */
export class DraggableFab {
  x = $state<number | null>(null);
  y = $state<number | null>(null);
  offsetX = $state(0);
  offsetY = $state(0);
  isDragging = $state(false);
  isSettling = $state(false);

  private readonly _storageKey: string;
  private _restored = false;
  private _pointerId = -1;
  private _didDrag = false;
  private _startPx = 0;
  private _startPy = 0;
  private _startBaseX = 0;
  private _startBaseY = 0;
  private _cancelSettle: (() => void) | null = null;

  constructor(storageKey: string) {
    this._storageKey = storageKey;
  }

  /** Restore a persisted position once. If nothing was persisted and
   *  `fallback` is given, use it instead — called lazily so the fallback
   *  can measure the real element (e.g. `offsetWidth`) once it exists. */
  restore(fallback?: () => { x: number; y: number }) {
    if (this._restored) return;
    this._restored = true;
    try {
      const raw = sessionStorage.getItem(this._storageKey);
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number };
        this.x = p.x;
        this.y = p.y;
        return;
      }
    } catch {
      /* ignore */
    }
    if (fallback) {
      const p = fallback();
      this.x = p.x;
      this.y = p.y;
    }
  }

  /** Keep a resting position on-screen across viewport resizes — call from
   *  an `$effect` that reacts to viewport width/height. No-op while still
   *  CSS-anchored (`x`/`y` null).
   *
   *  Wrapped in `untrack` because it reads (and sometimes writes) `x`/`y` —
   *  without it, the calling `$effect` would pick up `x`/`y` as *its own*
   *  dependencies and re-run on every drag/settle position update, not just
   *  real resizes. That previously clamped the settle tween's base back
   *  in-bounds mid-flight the instant a drop landed off-screen (which the
   *  tween is supposed to correct smoothly on its own), corrupting it. */
  clampToViewport(
    el: HTMLElement,
    vw: number,
    vh: number,
    margin = EDGE_MARGIN,
  ) {
    untrack(() => {
      if (this.x === null || this.y === null) return;
      const bw = el.offsetWidth || 56;
      const bh = el.offsetHeight || 56;
      const clampedX = Math.max(margin, Math.min(vw - bw - margin, this.x));
      const clampedY = Math.max(margin, Math.min(vh - bh - margin, this.y));
      if (clampedX !== this.x) this.x = clampedX;
      if (clampedY !== this.y) this.y = clampedY;
    });
  }

  onPointerDown(e: PointerEvent) {
    if (this._pointerId !== -1) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    if (this._cancelSettle) {
      // Grabbing mid-settle: cancel the tween and re-home the base to the
      // element's actual current on-screen position (which already accounts
      // for whatever the tween's live offset was) so the drag picks up from
      // exactly where it visually is, with zero jump. A plain tap/drag that
      // *isn't* interrupting a settle leaves `x`/`y` untouched — otherwise
      // every tap would permanently convert a still CSS-anchored FAB (`x`
      // null) to a JS-pixel-positioned one for no reason.
      this._cancelSettle();
      this._cancelSettle = null;
      this.isSettling = false;
      this.x = rect.left;
      this.y = rect.top;
      this.offsetX = 0;
      this.offsetY = 0;
    }

    this._pointerId = e.pointerId;
    this.isDragging = true;
    this._didDrag = false;
    this._startBaseX = this.x ?? rect.left;
    this._startBaseY = this.y ?? rect.top;
    this._startPx = e.clientX;
    this._startPy = e.clientY;
    el.setPointerCapture(e.pointerId);
  }

  /** Returns true exactly once per gesture, the frame the drag threshold is
   *  first crossed — lets a caller react (e.g. close an open panel). */
  onPointerMove(e: PointerEvent): boolean {
    if (e.pointerId !== this._pointerId || !this.isDragging) return false;
    const dx = e.clientX - this._startPx;
    const dy = e.clientY - this._startPy;
    const crossedThreshold =
      !this._didDrag && Math.hypot(dx, dy) > DRAG_THRESHOLD;
    if (crossedThreshold) this._didDrag = true;
    this.offsetX = dx;
    this.offsetY = dy;
    return crossedThreshold;
  }

  /** Ends the gesture: snaps to the nearest edge if it was a real drag.
   *  Returns "tap" for a plain click/tap so the caller decides what that
   *  means (open a panel, toggle, cancel picking, etc). */
  onPointerUp(e: PointerEvent): "tap" | "drag" | "ignored" {
    if (e.pointerId !== this._pointerId) return "ignored";
    const el = e.currentTarget as HTMLElement;
    this._pointerId = -1;
    this.isDragging = false;

    if (!this._didDrag) {
      this.offsetX = 0;
      this.offsetY = 0;
      return "tap";
    }

    this._snapToEdge(el);
    return "drag";
  }

  /** Force-end an in-progress drag with no matching pointerup — e.g. on
   *  window `blur` (alt-tab, a native dialog stealing focus mid-drag), where
   *  the pointer never actually releases so pointer capture doesn't help. */
  forceEnd(el: HTMLElement | undefined) {
    if (this._pointerId === -1) return;
    this._pointerId = -1;
    this.isDragging = false;
    if (!this._didDrag || !el) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    this._snapToEdge(el);
  }

  private _snapToEdge(el: HTMLElement, margin = EDGE_MARGIN) {
    const bw = el.offsetWidth;
    const bh = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const curX = this._startBaseX + this.offsetX;
    const curY = this._startBaseY + this.offsetY;
    const cx = curX + bw / 2;
    const cy = curY + bh / 2;

    type Candidate = { d: number; snap: () => Vec };
    const candidates: Candidate[] = [
      {
        d: cx,
        snap: () => ({
          x: margin,
          y: Math.max(margin, Math.min(vh - bh - margin, curY)),
        }),
      },
      {
        d: vw - cx,
        snap: () => ({
          x: vw - bw - margin,
          y: Math.max(margin, Math.min(vh - bh - margin, curY)),
        }),
      },
      {
        d: cy,
        snap: () => ({
          x: Math.max(margin, Math.min(vw - bw - margin, curX)),
          y: margin,
        }),
      },
      {
        d: vh - cy,
        snap: () => ({
          x: Math.max(margin, Math.min(vw - bw - margin, curX)),
          y: vh - bh - margin,
        }),
      },
    ];
    const target = candidates.reduce((a, b) => (a.d < b.d ? a : b)).snap();

    // Re-base to the current visual spot, offset folded to zero — pure
    // arithmetic (curX = old base + old offset), and `transition` is always
    // "none" on this class's styles, so this can never trigger a CSS
    // animation no matter how the DOM update batches. Only *then* does the
    // settle tween below carry `offset` from 0 up to `target - curX`, i.e.
    // it always animates from wherever the drag actually ended.
    this.x = curX;
    this.y = curY;
    this.offsetX = 0;
    this.offsetY = 0;

    this.isSettling = true;
    this._cancelSettle?.();
    this._cancelSettle = animateVector(
      { x: 0, y: 0 },
      { x: target.x - curX, y: target.y - curY },
      SETTLE_MS,
      (v) => {
        this.offsetX = v.x;
        this.offsetY = v.y;
      },
      () => {
        this.x = target.x;
        this.y = target.y;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isSettling = false;
        this._cancelSettle = null;
      },
    );

    try {
      sessionStorage.setItem(this._storageKey, JSON.stringify(target));
    } catch {
      /* ignore */
    }
  }

  /** Inline style for a `position:fixed` element resting at `x`/`y` (or still
   *  CSS-anchored, if null) with the live drag/settle delta layered on via
   *  `transform`. `right`/`bottom` are explicitly cancelled once `x`/`y` are
   *  set — a leftover CSS-anchored `bottom`/`right` combined with a new
   *  `top`/`left` would over-constrain the box and stretch it to fill the
   *  gap instead of sizing to content. `transition` is always `none`: every
   *  bit of motion, drag or settle, is a per-frame `transform` write, never
   *  a CSS-transitioned `left`/`top`. */
  style(cursor: string): string {
    const transform = `transform:translate(${this.offsetX}px,${this.offsetY}px);`;
    if (this.x !== null && this.y !== null) {
      return `position:fixed; left:${this.x}px; top:${this.y}px; right:auto; bottom:auto; ${transform} transition:none; touch-action:none; cursor:${cursor};`;
    }
    return `${transform} transition:none; touch-action:none; cursor:${cursor};`;
  }
}
