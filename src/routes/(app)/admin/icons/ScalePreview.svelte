<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import { ICON_SCALE_CONTEXT, type IconScale } from "$lib/icons";

  /** Supplies the scale being edited to every Icon inside; page chrome stays on the code scale. */
  let { scale, children }: { scale: () => IconScale; children: Snippet } = $props();

  // svelte-ignore state_referenced_locally
  setContext(ICON_SCALE_CONTEXT, scale);
</script>

{@render children()}
