<script lang="ts">
  import type { Snippet } from "svelte";
  import Link from "./Link.svelte";
  import Icon from "./Icon.svelte";
  import { cn } from 'tailwind-variants';

  let {
    href = "/",
    children,
    class: className = "",
  }: {
    href?: string;
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<Link {href} class={cn("group gap-2", className)} data-back-button>
  <Icon name="chevron-left" class="translate-x-0.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
  {#if children}
    {@render children()}
  {:else}
    <span>Back</span>
  {/if}
</Link>
