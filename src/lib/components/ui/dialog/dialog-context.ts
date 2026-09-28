import { getContext, setContext } from "svelte";

const ROOT_KEY = Symbol("dialog-root");
const CONTENT_KEY = Symbol("dialog-content");

export interface DialogRootCtx {
  get open(): boolean;
  get id(): string;
  get labelled(): boolean;
  close(): void;
}

export interface DialogContentCtx {
  onDragStart(event: PointerEvent): void;
}

export const setDialogRootCtx = (ctx: DialogRootCtx) =>
  setContext(ROOT_KEY, ctx);
export const getDialogRootCtx = (): DialogRootCtx => getContext(ROOT_KEY);

export const setDialogContentCtx = (ctx: DialogContentCtx) =>
  setContext(CONTENT_KEY, ctx);
export const getDialogContentCtx = (): DialogContentCtx =>
  getContext(CONTENT_KEY);
