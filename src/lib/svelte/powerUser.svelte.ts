import { getContext, setContext } from "svelte";

const KEY = Symbol.for("orakl.power-user");

/**
 * Publish whether the current account holds `is-power-user`. Called once by the
 * root layout; a getter rather than a value so the answer follows `data.user`
 * across navigations instead of freezing at mount.
 */
export function setPowerUser(get: () => boolean): void {
  setContext(KEY, get);
}

/** False wherever no provider sits above — an isolated component test, say. */
export function isPowerUser(): boolean {
  return getContext<(() => boolean) | undefined>(KEY)?.() ?? false;
}
