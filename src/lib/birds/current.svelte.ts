import type { SkyDriver } from "./driver";

/**
 * The mounted sky's runner, published by `Birds.svelte` so the `?birds`
 * control panel (rendered outside the inert sky layer) can drive it.
 */
export const current = $state<{ runner: SkyDriver | null }>({ runner: null });
