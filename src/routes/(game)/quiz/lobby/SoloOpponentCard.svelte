<script lang="ts">
  import { page } from "$app/state";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import type { Npc } from "@/lib/npcs.js";

  /** One chunk per portrait, fetched when its card renders. */
  const portraits = import.meta.glob<string>("@/assets/icons/npcs/*.svg", {
    query: "?raw",
    import: "default",
  });

  let { npc }: { npc: Npc } = $props();

  // The owner's drafts ride in layout data; outside a SvelteKit page (tests,
  // isolated renders) there is no page state to read.
  function draftFor(id: string): string | undefined {
    try {
      return page.data?.iconDrafts?.[`npc-${id}`];
    } catch {
      return undefined;
    }
  }

  const portrait = $derived(
    draftFor(npc.id) || portraits[`/src/assets/icons/npcs/${npc.id}.svg`]?.(),
  );
</script>

<Card variant="ground" class="text-foreground-darker flex gap-4 flex-row">
  <span class="size-40 shrink-0 text-secondary-300 [&>svg]:size-full" aria-hidden="true">
    {#await portrait then svg}{@html svg}{/await}
  </span>
  <div class="flex flex-col gap-2 items-start">
    <div class="flex gap-2 items-end">
      <span class="text-3xl text-foreground font-bold">{npc.title}</span>
      <Badge>{npc.badge}</Badge>
    </div>
    <div class="flex flex-col gap-1 text-sm">
      {#each npc.description as paragraph (paragraph)}
        <p>{@html paragraph}</p>
      {/each}
    </div>
  </div>
</Card>
