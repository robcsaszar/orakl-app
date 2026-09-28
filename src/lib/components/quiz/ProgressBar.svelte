<script lang="ts">
  import { quartIn } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { cn } from "tailwind-variants";
  import Progress from "$lib/components/ui/Progress.svelte";
  interface Props {
    progress: number;
    label?: string;
    class?: string;
  }

  let { progress, label, class: className }: Props = $props();
</script>

<div class={cn("relative isolate self-stretch select-none", className)}>
  <div class="relative z-0" in:fade={{ duration: 300, easing: quartIn }}>
    <Progress value={progress} label={label ?? "Round progress"} class="h-3" />
  </div>
  {#if label}
    <div
      class="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-linear-90 from-transparent from-25% via-background/50 to-75% to-transparent rounded-full"
      in:fade={{ duration: 300, easing: quartIn }}
    >
      <span class="whitespace-nowrap text-shadow-background text-shadow-outline-thin text-lg">
        {label}
      </span>
    </div>
  {/if}
</div>
