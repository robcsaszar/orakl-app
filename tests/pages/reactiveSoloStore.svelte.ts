import { createSoloModeStore } from "@/lib/soloMode.store.js";

/** `$state`-wrapped store for tests that render the page directly (the store
 *  is a plain object; only a rune-wrapped reference is reactive in a
 *  component tree, same as (app)/solo/+layout.svelte). */
export function makeReactiveSoloStore(
  ...args: Parameters<typeof createSoloModeStore>
) {
  const store = $state(createSoloModeStore(...args));
  return store;
}
