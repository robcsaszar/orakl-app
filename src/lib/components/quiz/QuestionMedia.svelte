<script lang="ts">
  interface Props {
    src: string;
    /** Caps the frame at `max-h-xs` instead of `max-h-sm`, for the display's tighter slot. */
    compact?: boolean;
  }

  let { src, compact = false }: Props = $props();
</script>

<div class="flex rounded-xl corner-shape-squircle border border-foreground-darker/30 overflow-hidden aspect-video mx-auto {compact ? 'max-h-xs' : 'max-h-sm'}">
  <img {src} alt="Question" loading="lazy" class="h-auto w-full object-contain" />
</div>
