<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn, tv } from "tailwind-variants";

  const sliderVariants = tv({
    slots: {
      root: "flex flex-col group",
      heading: "flex items-baseline justify-between gap-2",
      value: "font-mono tabular-nums text-foreground-darker",
      track: "w-full cursor-pointer appearance-none rounded-full bg-background-lighter/40 accent-secondary",
    },
    variants: {
      size: {
        default: {
          root: "gap-2",
          heading: "text-lg",
          value: "text-sm",
          track: "h-2 [&::-webkit-slider-thumb]:size-5 [&::-moz-range-thumb]:size-5",
        },
        sm: {
          root: "gap-1",
          heading: "font-mono text-xs",
          value: "text-xs",
          track: "h-1.5 [&::-webkit-slider-thumb]:size-4 [&::-moz-range-thumb]:size-4",
        },
      },
    },
    defaultVariants: { size: "default" },
  });

  let {
    id,
    label,
    hideLabel = false,
    name,
    min = 0,
    max = 100,
    step = 1,
    value = $bindable(0),
    showValue = true,
    format = (v: number) => String(v),
    size,
    class: className = "",
    ...props
  }: {
    id: string;
    label: string;
    /** Keep the label for assistive tech only */
    hideLabel?: boolean;
    name?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    /** Show the current value beside the label */
    showValue?: boolean;
    format?: (value: number) => string;
    size?: VariantProps<typeof sliderVariants>["size"];
    class?: string;
  } & Omit<HTMLInputAttributes, "id" | "name" | "type" | "min" | "max" | "step" | "value" | "size" | "class"> =
    $props();

  const styles = $derived(sliderVariants({ size }));

  const thumb =
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:active:scale-110 " +
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-secondary";
</script>

<label for={id} class={styles.root({ class: className })}>
  <span class={styles.heading()}>
    <span class={cn(hideLabel && "sr-only")}>{label}</span>
    {#if showValue}
      <span class={styles.value()} aria-hidden="true">
        {format(value)}
      </span>
    {/if}
  </span>
  <input
    type="range"
    {id}
    {name}
    {min}
    {max}
    {step}
    bind:value
    class={cn(
      styles.track(),
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      thumb,
    )}
    {...props}
  />
</label>
