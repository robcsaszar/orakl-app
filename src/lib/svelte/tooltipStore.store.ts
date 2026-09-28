import { writable } from "svelte/store";
import { Position } from "../types/tooltip.types.js";

export type { TooltipOptions } from "../types/tooltip.types.js";
export { Position };

export type TooltipStore = {
  isVisible: boolean;
  isPositioned: boolean;
  content: string;
  position: Position;
  showArrow: boolean;
  top: number;
  left: number;
  arrowOffset: number;
  isScrolling: boolean;
};

// Pure TS factory — no Svelte-reactive deps, safe to import in Vitest
export function createTooltipStore(): TooltipStore {
  return {
    isVisible: false,
    isPositioned: false,
    content: "",
    position: Position.BOTTOM,
    showArrow: true,
    top: 0,
    left: 0,
    arrowOffset: 50,
    isScrolling: false,
  };
}

// Named action functions — pure, return new state

export function showTooltipState(
  s: TooltipStore,
  content: string,
  position: Position,
  showArrow: boolean,
): TooltipStore {
  return {
    ...s,
    isVisible: true,
    isPositioned: false,
    content,
    position,
    showArrow,
  };
}

export function hideTooltipState(s: TooltipStore): TooltipStore {
  return { ...s, isVisible: false, content: "", isScrolling: false };
}

export function setTooltipPosition(
  s: TooltipStore,
  top: number,
  left: number,
  arrowOffset: number,
  position: Position,
): TooltipStore {
  return { ...s, isPositioned: true, top, left, arrowOffset, position };
}

export function setTooltipScrolling(
  s: TooltipStore,
  isScrolling: boolean,
): TooltipStore {
  return { ...s, isScrolling };
}

export function resetTooltipStore(_s: TooltipStore): TooltipStore {
  return createTooltipStore();
}

// Singleton Svelte writable store
export const tooltipStore = writable<TooltipStore>(createTooltipStore());
