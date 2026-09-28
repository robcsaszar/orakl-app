<script lang="ts">
  import { NPCS } from "@/lib/npcs.js";
  import SoloOpponentCard from "@/routes/(game)/quiz/lobby/SoloOpponentCard.svelte";
</script>

<svelte:head><title>Mimic — NPCs</title></svelte:head>

<div class="flex flex-col gap-2">
  <h1 class="text-2xl font-bold">Solo-lobby opponents</h1>
  <p class="text-sm text-foreground-darker">
    Every entry in <code>src/lib/npcs.ts</code> ({NPCS.length} total). The real lobby
    picks one deterministically per lobby code (see <code>quiz/lobby</code> with
    <code>?players=1</code>).
  </p>
</div>

<div class="flex flex-col gap-4">
  {#each NPCS as npc (npc.id)}
    <SoloOpponentCard {npc} />
  {/each}
</div>
