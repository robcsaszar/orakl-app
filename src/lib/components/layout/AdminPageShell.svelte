<script lang="ts">
  import type { Snippet } from "svelte";
  import BackButton from "$lib/components/ui/BackButton.svelte";

  let {
    backHref,
    children,
  }: {
    backHref: string;
    children: Snippet;
  } = $props();
</script>

<div class="flex items-center gap-4 py-5">
  <BackButton href={backHref} />
</div>
{@render children()}
