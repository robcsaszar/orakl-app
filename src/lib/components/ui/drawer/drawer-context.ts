import { getContext, setContext } from "svelte";

const ROOT_KEY = Symbol("drawer-root");
const CONTENT_KEY = Symbol("drawer-content");

export interface DrawerRootCtx {
  get open(): boolean;
  get id(): string;
  get labelled(): boolean;
  close(): void;
}

export interface DrawerContentCtx {
  onDragStart(e: PointerEvent): void;
}

export const setDrawerRootCtx = (ctx: DrawerRootCtx) =>
  setContext(ROOT_KEY, ctx);
export const getDrawerRootCtx = (): DrawerRootCtx => getContext(ROOT_KEY);
export const setDrawerContentCtx = (ctx: DrawerContentCtx) =>
  setContext(CONTENT_KEY, ctx);
export const getDrawerContentCtx = (): DrawerContentCtx =>
  getContext(CONTENT_KEY);
