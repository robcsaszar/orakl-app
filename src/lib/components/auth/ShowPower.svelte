<script lang="ts">
import { hasPower } from "@orakl/shared";
import type { UserPower } from "@orakl/shared";
  import type { Snippet } from "svelte";

  import { page } from "$app/state";

  let { power, children }: { power: UserPower; children: Snippet } = $props();
  const show = $derived(hasPower(page.data.user ?? null, power));
</script>

{#if show}
  {@render children()}
{/if}
