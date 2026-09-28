<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { cn } from "tailwind-variants";
  import { emoteStyle } from "@/lib/emotes.js";
  import { MediaQuery } from "svelte/reactivity";
  import EmotePetal from "./EmotePetal.svelte";
  import SentEmote from "./SentEmote.svelte";

  /**
   * Wraps a question's answer UI with the emote reaction gesture: long-press
   * (touch + mouse/trackpad) opens a fan of `pickedEmotes` at the press
   * point; picking one sends it (one tap, no answer targeting)
   * and renders every player's incoming emotes as floats positioned by
   * fraction-of-area coordinates.
   */
  let {
    pickedEmotes,
    activeEmotes,
    canEmote,
    onSend,
    intermission = false,
    children,
  }: {
    pickedEmotes: string[];
    activeEmotes: {
      uid: string;
      playerId: string;
      emoteId: string;
      offsetX: number;
      offsetY: number;
    }[];
    canEmote: boolean;
    onSend: (emoteId: string, offsetX: number, offsetY: number) => void;
    intermission?: boolean;
    children: Snippet;
  } = $props();

  let areaEl = $state<HTMLDivElement | undefined>(undefined);
  let emoteMenu = $state<{ x: number; y: number } | null>(null);
  /** Index of the fan icon currently under the held pointer, while dragging. */
  let hoverIndex = $state<number | null>(null);
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStart: { x: number; y: number } | null = null;
  const LONG_PRESS_MS = 500;
  const MOVE_CANCEL_PX = 10;
  // Fan opens upward from the tap point, spanning this many degrees.
  const FAN_ARC_DEG = 140;
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  // A finger hides what it touches: on coarse pointers the petals, the sent
  // emote, the fan radius and the hit target are all half again as large.
  const coarsePointer = new MediaQuery("(pointer: coarse)");
  const petalSize = $derived(coarsePointer.current ? 48 : 32);
  const emoteSize = $derived(coarsePointer.current ? 72 : 48);
  const fanRadiusPx = $derived(coarsePointer.current ? 96 : 64);
  // Generous touch target — bigger than the icon itself.
  const hitRadiusPx = $derived(coarsePointer.current ? 42 : 28);

  $effect(() => {
    // Close the fan whenever it's no longer valid to react (answered reset,
    // round resolved, or emotes disabled) rather than leaving it stranded.
    if (!canEmote) emoteMenu = null;
  });

  // Belt-and-suspenders for touch: pointer capture should route the release
  // back to the element that opened the fan (handlePointerUp), but some
  // mobile browsers drop or reroute pointerup/pointercancel once their own
  // long-press gesture recognizer has taken over mid-hold — leaving the fan
  // stuck open with nothing selected. A window-level fallback guarantees the
  // fan still closes even when that per-element event never arrives.
  $effect(() => {
    if (!emoteMenu) return;
    const dismissIfNoPick = () => {
      if (hoverIndex === null) emoteMenu = null;
      hoverIndex = null;
    };
    window.addEventListener("pointerup", dismissIfNoPick);
    window.addEventListener("pointercancel", dismissIfNoPick);
    return () => {
      window.removeEventListener("pointerup", dismissIfNoPick);
      window.removeEventListener("pointercancel", dismissIfNoPick);
    };
  });

  function clamp01(n: number): number {
    return Math.min(1, Math.max(0, n));
  }

  function pointToFraction(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!areaEl) return null;
    const rect = areaEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  function openEmoteMenu(clientX: number, clientY: number) {
    if (!canEmote) return;
    const point = pointToFraction(clientX, clientY);
    if (point) emoteMenu = point;
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    pressStart = null;
  }

  function handlePointerDown(e: PointerEvent) {
    if (!canEmote || (e.pointerType === "mouse" && e.button !== 0)) return;
    pressStart = { x: e.clientX, y: e.clientY };
    const { clientX, clientY } = e;
    // Capture so the drag-to-select below keeps tracking this pointer even
    // once the fan (a higher stacking layer) is what's visually underneath it.
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      openEmoteMenu(clientX, clientY);
    }, LONG_PRESS_MS);
  }

  function fanOffset(index: number, total: number): { dx: number; dy: number } {
    const angleDeg =
      total <= 1 ? -90 : -90 - FAN_ARC_DEG / 2 + (index / (total - 1)) * FAN_ARC_DEG;
    const angle = (angleDeg * Math.PI) / 180;
    return {
      dx: Math.round(Math.cos(angle) * fanRadiusPx),
      dy: Math.round(Math.sin(angle) * fanRadiusPx),
    };
  }

  function iconScreenPos(dx: number, dy: number): { x: number; y: number } | null {
    if (!areaEl || !emoteMenu) return null;
    const rect = areaEl.getBoundingClientRect();
    return {
      x: rect.left + emoteMenu.x * rect.width + dx,
      y: rect.top + emoteMenu.y * rect.height + dy,
    };
  }

  function updateHoverFromPoint(clientX: number, clientY: number) {
    if (!emoteMenu) {
      hoverIndex = null;
      return;
    }
    let closest: number | null = null;
    let closestDist = hitRadiusPx;
    for (let i = 0; i < pickedEmotes.length; i++) {
      const { dx, dy } = fanOffset(i, pickedEmotes.length);
      const pos = iconScreenPos(dx, dy);
      if (!pos) continue;
      const dist = Math.hypot(clientX - pos.x, clientY - pos.y);
      if (dist <= closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    hoverIndex = closest;
  }

  function handlePointerMove(e: PointerEvent) {
    if (emoteMenu) {
      updateHoverFromPoint(e.clientX, e.clientY);
      return;
    }
    if (!pressStart) return;
    const dx = e.clientX - pressStart.x;
    const dy = e.clientY - pressStart.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) cancelLongPress();
  }

  // Mobile/trackpad: release over an icon (without lifting the finger in
  // between) to pick it, same as WhatsApp/Slack-style reaction pickers —
  // no second tap needed.
  function handlePointerUp() {
    cancelLongPress();
    if (emoteMenu) {
      const emoteId = hoverIndex !== null ? pickedEmotes[hoverIndex] : undefined;
      if (emoteId) pickEmote(emoteId);
      else emoteMenu = null;
    }
    hoverIndex = null;
  }

  function handlePointerCancel() {
    cancelLongPress();
    emoteMenu = null;
    hoverIndex = null;
  }

  // Suppress the native menu over this area: a touch long-press fires
  // contextmenu on Android, and a right-click must not open anything either.
  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  // Always send from the initial long-press point, regardless of
  // which fan icon is picked — the fan is just a menu, not a target.
  function pickEmote(emoteId: string) {
    if (!emoteMenu) return;
    onSend(emoteId, emoteMenu.x, emoteMenu.y);
    emoteMenu = null;
  }
</script>

<style>
  .emote-area {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    /* Without this, the browser treats a moving touch as a page-scroll
       gesture and fires pointercancel on us mid-drag, killing the fan. */
    touch-action: none;
  }
</style>

<div
  bind:this={areaEl}
  class={cn("relative", [intermission ? "blur-sm pointer-events-none select-none" : ""])}
  role="presentation"
  oncontextmenu={handleContextMenu}
>
  {#each activeEmotes as emote (emote.uid)}
    <div
      class="pointer-events-none absolute z-20"
      style="top:calc({emote.offsetY * 100}% - {emoteSize}px);left:calc({emote.offsetX * 100}% - {emoteSize / 2}px)"
    >
      <SentEmote emoteId={emote.emoteId} size={emoteSize} reducedMotion={reducedMotion.current} />
    </div>
  {/each}

  {#if canEmote}
    <!-- The answer tiles beneath are disabled once answered, and disabled
         buttons swallow pointer events before they bubble — this overlay
         is the only reliable long-press surface. -->
    <div
      class="emote-area absolute inset-0 z-20"
      role="presentation"
      aria-hidden="true"
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointercancel={handlePointerCancel}
      oncontextmenu={handleContextMenu}
    ></div>
  {/if}

  {#if emoteMenu}
    <button
      type="button"
      class="fixed inset-0 z-30 cursor-default"
      aria-label="Dismiss emote menu"
      onclick={() => (emoteMenu = null)}
    ></button>
    <div class="pointer-events-none absolute z-40" style="left:{emoteMenu.x * 100}%;top:{emoteMenu.y * 100}%">
      {#each pickedEmotes as emoteId, i (emoteId)}
        {@const { dx, dy } = fanOffset(i, pickedEmotes.length)}
        <EmotePetal {dx} {dy} index={i} size={petalSize} reducedMotion={reducedMotion.current}>
          <!-- The held-over petal lifts and grows so a finger does not hide it. -->
          <Button
            unstyled
            onclick={() => pickEmote(emoteId)}
            class={cn(
              "p-1 transition-transform hover:-translate-y-1.5 hover:scale-125 active:scale-90",
              hoverIndex === i ? "-translate-y-1.5 scale-125" : "",
            )}
            title={emoteId}
            aria-label={`Send ${emoteId}`}
          >
            <div style={emoteStyle(emoteId, petalSize)}></div>
          </Button>
        </EmotePetal>
      {/each}
    </div>
  {/if}

  {@render children()}
</div>
