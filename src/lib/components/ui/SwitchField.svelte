<!--
  A Switch with its visible label and an optional hint, as one row: the text
  on the left names the setting, the switch on the right sets it. Clicking the
  text moves the switch too.
-->
<script lang="ts">
  import { cn } from "tailwind-variants";
  import Switch from "./Switch.svelte";

  let {
    label,
    description,
    checked = false,
    disabled = false,
    size = "default",
    class: className = "",
    onchange,
  }: {
    label: string;
    /** Hint under the label, in plain words */
    description?: string;
    checked?: boolean;
    disabled?: boolean;
    size?: "default" | "sm";
    class?: string;
    /** Receives the state the switch is being moved to. */
    onchange?: (checked: boolean) => void;
  } = $props();
</script>

<div class={cn("flex items-center justify-between gap-3", className)}>
  <!-- The Switch carries the accessible name; the text is a second, pointer-only way to move it. -->
  <button
    type="button"
    tabindex="-1"
    aria-hidden="true"
    {disabled}
    class="flex min-w-0 flex-col items-start text-left cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50"
    onclick={() => onchange?.(!checked)}
  >
    <span class={size === "sm" ? "font-mono text-xs" : "text-lg"}>{label}</span>
    {#if description}
      <span class={cn("text-foreground-darker", size === "sm" ? "text-[11px] leading-snug" : "text-sm")}>{description}</span>
    {/if}
  </button>
  <Switch label={description ? `${label}. ${description}` : label} {checked} {disabled} {onchange} />
</div>
