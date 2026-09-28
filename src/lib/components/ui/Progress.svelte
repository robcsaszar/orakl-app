<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "tailwind-variants";

  let {
    value,
    label,
    class: className = "",
    barClass = "",
    ...props
  }: {
    /** 0–100 */
    value: number;
    /** Accessible name — what is progressing */
    label: string;
    /** Track classes (height, colour) */
    class?: string;
    /** Fill classes (colour) */
    barClass?: string;
  } & HTMLAttributes<HTMLDivElement> = $props();

  const clamped = $derived(Math.max(0, Math.min(100, value)));
</script>

<!-- Determinate bar. Fills by transform so the animation stays off the layout thread — never animate width. -->
<div
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(clamped)}
  aria-label={label}
  class={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary/25", className)}
  {...props}
>
  <div
    aria-hidden="true"
    class={cn(
      "absolute inset-0 origin-left rounded-full bg-secondary transition-transform duration-300 ease-ease-in-out-quart",
      barClass,
    )}
    style:transform="scaleX({clamped / 100})"
  ></div>
</div>
