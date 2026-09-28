<script lang="ts">
import { avatarDescription } from "@orakl/shared";
  import Card from "$lib/components/ui/Card.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";

  let {
    src,
    title,
    description,
  }: { src?: string; title?: string; description?: string } = $props();
</script>

<Card variant="highlighted" class="flex-row items-start gap-4">
  <div
    class="flex shrink-0 items-center justify-center size-14 corner-shape-squircle rounded-lg bg-background-lighter/40 border-2 border-secondary/40"
  >
    {#if src}
      <img {src} alt="" aria-hidden="true" class="size-10" style="image-rendering: pixelated;" />
    {:else}
      <Icon name="orakl" class="size-8"></Icon>
    {/if}
  </div>
  <div class="flex flex-col gap-1 min-w-0" aria-live="polite">
    <p class="font-sans font-semibold text-base text-pretty">{title || "No avatar yet"}</p>
    {#if title}
      <p class="font-sans text-sm text-foreground/80 text-pretty">
        {avatarDescription(description)}
      </p>
    {/if}
  </div>
</Card>
