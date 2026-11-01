<script lang="ts">
  import type { Snippet } from "svelte";
  import Link from "./Link.svelte";
  import Icon from "./Icon.svelte";
  import { cn } from 'tailwind-variants';
  import { backTrail } from "$lib/svelte/route-history.svelte.js";

  let {
    href = "/",
    children,
    class: className = "",
  }: {
    href?: string;
    children?: Snippet;
    class?: string;
  } = $props();

  // Came straight from the target → step back in history, so the browser's
  // own back and this button land on the same entry (tab, filters, scroll).
  // Otherwise (deep link, reload, other entry point) follow `href`.
  function onclick(e: MouseEvent) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (backTrail.from !== new URL(href, location.href).pathname) return;
    e.preventDefault();
    history.back();
  }
</script>

<Link {href} {onclick} class={cn("group gap-2", className)} data-back-button>
  <Icon name="chevron-left" class="translate-x-0.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
  {#if children}
    {@render children()}
  {:else}
    <span>Back</span>
  {/if}
</Link>
