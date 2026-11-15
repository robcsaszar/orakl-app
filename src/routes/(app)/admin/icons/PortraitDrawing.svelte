<script lang="ts">
  import { page } from "$app/state";

  /** One chunk per portrait, fetched when its drawing renders. */
  const portraits = import.meta.glob<string>("@/assets/icons/npcs/*.svg", {
    query: "?raw",
    import: "default",
  });

  /** `class` sets the drawing size; the opponent card size is the default. */
  let { id, class: className = "size-40" }: { id: string; class?: string } = $props();

  const portrait = $derived(
    page.data?.iconDrafts?.[`npc-${id}`] ||
      portraits[`/src/assets/icons/npcs/${id}.svg`]?.(),
  );
</script>

<span class="{className} shrink-0 text-secondary-300 [&>svg]:size-full" aria-hidden="true">
  {#await portrait then svg}{@html svg}{/await}
</span>
