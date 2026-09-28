<script lang="ts">
import { hasRole } from "@orakl/shared";
import type { UserRole } from "@orakl/shared";
  import type { Snippet } from "svelte";

  import { page } from "$app/state";

  let { role, children }: { role: UserRole; children: Snippet } = $props();
  const show = $derived(hasRole(page.data.user?.role ?? "anonymous", role));
</script>

{#if show}
  {@render children()}
{/if}
