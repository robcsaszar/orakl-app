<!--
  One tool in the sky panel's top bar. `pressed` is for the ones that are on
  or off.
-->
<script lang="ts">
  import Button from "@/lib/components/ui/Button.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import type { IconUsage } from "$lib/icon-usages";
  import type { RoleName } from "$lib/icons";

  let {
    name,
    usage,
    label,
    onclick,
    pressed,
    disabled = false,
  }: {
    name: RoleName;
    usage: IconUsage;
    label: string;
    onclick: () => void;
    pressed?: boolean;
    disabled?: boolean;
  } = $props();
</script>

<Button
  unstyled
  aria-label={label}
  data-tooltip={label}
  aria-pressed={pressed}
  {disabled}
  class="rounded-xl p-2 max-sm:p-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary {disabled
    ? 'cursor-not-allowed text-foreground-darker/35'
    : pressed
      ? 'cursor-pointer bg-secondary text-background'
      : 'cursor-pointer text-foreground hover:bg-secondary/15'}"
  {onclick}
>
  <Icon {name} {usage} size="md" />
</Button>
