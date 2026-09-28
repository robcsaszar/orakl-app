<script lang="ts">
  import type { Snippet } from "svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Link from "$lib/components/ui/Link.svelte";

  let {
    title,
    trailing,
    meta,
    href,
    linkLabel,
    ariaLabel,
  }: {
    /** The row's headline — a plain name, or a snippet for extras (e.g. a Badge). */
    title: string | Snippet;
    /** What the row is scanned for: a score (set as a number) or a short label like a rank or winner. */
    trailing: string | number;
    /** Secondary line: date · accuracy · streak, or similar. */
    meta: string;
    href: string;
    linkLabel: string;
    ariaLabel: string;
  } = $props();
</script>

<Card class="flex-row flex-wrap items-center justify-between gap-4">
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2 font-semibold">
      {#if typeof title === "string"}
        {title}
      {:else}
        {@render title()}
      {/if}
    </div>
    <span class="text-sm text-foreground-darker font-sans">{meta}</span>
  </div>
  <div class="flex items-center gap-4">
    <span
      class={typeof trailing === "number"
        ? "font-mono text-lg font-semibold tabular-nums"
        : "font-semibold"}
    >
      {trailing}
    </span>
    <Link {href} intent="inline" aria-label={ariaLabel}>{linkLabel}</Link>
  </div>
</Card>
