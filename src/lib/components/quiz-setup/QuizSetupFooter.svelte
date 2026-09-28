<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import StickyFooter from "$lib/components/ui/partials/StickyFooter.svelte";

  let {
    formId,
    disabled,
    submitLabel,
    poolText,
    maxTimeText,
    disabledTooltip,
    enabledTooltip,
    tooltipDisabledTimeout = "5000",
    tooltipEnabledTimeout = "2000",
  }: {
    formId: string;
    disabled: boolean;
    submitLabel: string;
    poolText: string;
    maxTimeText: string;
    disabledTooltip: string;
    enabledTooltip: string;
    tooltipDisabledTimeout?: string;
    tooltipEnabledTimeout?: string;
  } = $props();
</script>

<StickyFooter>
  <div class="flex justify-between gap-6 px-4 md:px-8 md:py-6 py-4 md:flex-row flex-col md:items-center items-stretch">
    <!-- Summary stats -->
    <div class="flex-1 flex flex-col gap-x-4 gap-y-2 text-sm font-sans">
      <div class="flex gap-2">
        <span class="text-foreground-darker">Question pool</span>
        <span class="font-mono">{poolText}</span>
      </div>
      <div class="flex gap-2">
        <span class="text-foreground-darker">Max game time</span>
        <span class="font-mono">{maxTimeText}</span>
      </div>
    </div>

    <!-- Submit -->
    <Button
      type="submit"
      form={formId}
      {disabled}
      variant="primary"
      intent="cta"
      data-tooltip={disabled ? disabledTooltip : enabledTooltip}
      data-tooltip-position="top"
      data-tooltip-timeout={disabled ? tooltipDisabledTimeout : tooltipEnabledTimeout}
      data-tooltip-show={disabled ? "true" : undefined}
      data-tooltip-once={disabled ? "false" : "true"}
    >
      {submitLabel}
    </Button>
  </div>
</StickyFooter>
