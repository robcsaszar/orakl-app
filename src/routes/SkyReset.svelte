<!--
  The reset of one setting: a small icon button after the setting's label.
  It always holds its place, so nothing moves when it comes or goes; it fades
  in when the setting is changed and out when it is not.
-->
<script lang="ts">
  import Button from "@/lib/components/ui/Button.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";

  let {
    label,
    changed,
    onclick,
    tip = "Changed. Click to reset it.",
  }: {
    /** The setting's name, for "Reset how many". */
    label: string;
    /** Whether the setting differs from the one it resets to. */
    changed: boolean;
    onclick: () => void;
    tip?: string;
  } = $props();
</script>

<Button
  unstyled
  aria-label="Reset {label.toLowerCase()}"
  data-tooltip={changed ? tip : undefined}
  disabled={!changed}
  tabindex={changed ? 0 : -1}
  class="relative inline-flex size-4 shrink-0 items-center justify-center rounded-full text-primary transition-[opacity,scale] duration-150 ease-out before:absolute before:content-[''] [@media(pointer:coarse)]:before:-inset-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary motion-reduce:transition-none {changed
    ? 'cursor-pointer opacity-100 hover:text-foreground'
    : 'pointer-events-none scale-50 opacity-0'}"
  onclick={(e: MouseEvent) => {
    // It sits inside the setting's label: the click is its own, not the setting's.
    e.preventDefault();
    e.stopPropagation();
    onclick();
  }}
>
  <Icon name="reset" size="xs" />
</Button>
