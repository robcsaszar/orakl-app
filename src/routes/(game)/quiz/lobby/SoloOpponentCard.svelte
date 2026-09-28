<script lang="ts">
  import Card from "$lib/components/ui/Card.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import type { Npc } from "@/lib/npcs.js";

  let { npc }: { npc: Npc } = $props();
</script>

<Card variant="ground" class="text-foreground-darker flex gap-4 flex-row">
  <Icon name="npcs/{npc.id}" class="w-40 h-auto text-secondary-300" />
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
