<script lang="ts">
  import { cn, tv } from "tailwind-variants";

  const switchTrackVariants = tv({
    base: [
      "relative inline-flex h-6 w-11 shrink-0 items-center p-1",
      "rounded-lg corner-shape-squircle border-2",
      "transition-colors duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
      "motion-reduce:transition-none",
      "disabled:opacity-50",
    ],
    variants: {
      state: {
        on: "border-secondary bg-secondary",
        off: "border-secondary/25 bg-background-lighter/20 enabled:hover:border-secondary/50",
      },
    },
    defaultVariants: { state: "off" },
  });

  let {
    label,
    checked = false,
    disabled = false,
    class: className = "",
    onchange,
  }: {
    /** Accessible name. The switch carries no visible text of its own. */
    label: string;
    checked?: boolean;
    disabled?: boolean;
    class?: string;
    /** Receives the state the switch is being moved to. */
    onchange?: (checked: boolean) => void;
  } = $props();

  let focused = $state(false);

  const trackCls = $derived(
    cn(
      switchTrackVariants({ state: checked ? "on" : "off" }),
      focused && "ring-2 ring-secondary/30 ring-offset-2 ring-offset-background",
      className,
    ),
  );
</script>

<button
  type="button"
  role="switch"
  {disabled}
  aria-checked={checked}
  aria-label={label}
  class={trackCls}
  onfocus={() => {
    focused = true;
  }}
  onblur={() => {
    focused = false;
  }}
  onclick={() => {
    if (disabled) return;
    onchange?.(!checked);
  }}
>
  <!-- Travel is the track's inner width less the thumb: the 44px track less
       4px of border and 8px of padding leaves 32px, less the 16px thumb = 16px.
       Transform, never `left` — DESIGN.md keeps layout properties out of
       micro-interactions. -->
  <span
    class="size-4 rounded-[0.3rem] corner-shape-squircle transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none {checked
      ? 'translate-x-4 bg-background'
      : 'translate-x-0 bg-foreground-darker'}"
    aria-hidden="true"
  ></span>
</button>
