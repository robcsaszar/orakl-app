<script lang="ts">
  import type { MediaCredit } from "@orakl/shared";
  import ImageCredit from "./ImageCredit.svelte";

  interface Props {
    src: string;
    /** Author, licence and source line shown under the image. */
    credit?: MediaCredit;
    /** Caps the frame at `max-h-xs` instead of `max-h-sm`, for the display's tighter slot. */
    compact?: boolean;
    /** Question id; adds a Report link to the caption. */
    questionId?: string;
  }

  let { src, credit, compact = false, questionId }: Props = $props();
</script>

<div class="flex flex-col gap-1">
<div class="flex rounded-xl corner-shape-squircle border border-foreground-darker/30 overflow-hidden aspect-video mx-auto {compact ? 'max-h-xs' : 'max-h-sm'}">
  <img {src} alt="Question" loading="lazy" class="h-auto w-full object-contain" />
</div>
{#if credit}
  <ImageCredit {credit} {questionId} variant={compact ? "display" : "default"} />
{/if}
</div>
