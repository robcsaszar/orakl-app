<script lang="ts">
import { FONT_DESCRIPTIONS, FONT_LABELS, FONT_PREFERENCES } from "@orakl/shared";
import type { FontPreference } from "@orakl/shared";

import { applyFont } from "$lib/font-helpers.js";
import { toast } from "$lib/toast.js";
import SegmentedPicker from "$lib/components/ui/SegmentedPicker.svelte";

interface Props {
  currentFont: FontPreference;
}

let { currentFont }: Props = $props();

const fonts = FONT_PREFERENCES;
const labels = FONT_LABELS;
const descriptions = FONT_DESCRIPTIONS;

// Per-option preview family — default inherits, dyslexic forces OpenDyslexic.
const previewFamily: Record<FontPreference, string> = {
  default: "inherit",
  dyslexic: '"OpenDyslexic", sans-serif',
};

let activeFont: FontPreference = $state("default");

$effect(() => {
  activeFont = currentFont;
});

async function selectFont(font: FontPreference) {
  activeFont = font;
  const toastId = toast.loading("Applying…");
  try {
    await applyFont(font);
    toast.success("Font updated.", { id: toastId });
  } catch {
    toast.error("Failed to update font.", { id: toastId });
  }
}
</script>

<div class="flex flex-col gap-4" id="font-picker">
  <SegmentedPicker
    label="Font"
    options={fonts}
    selectedKey={activeFont}
    onSelect={selectFont}
    class="grid grid-cols-1 gap-2 sm:grid-cols-2"
  >
    {#snippet option(font)}
      <span class="font-bold text-current">{labels[font]}</span>
      <span class="text-foreground-darker leading-tight font-sans text-sm group-aria-checked:text-background">{descriptions[font]}</span>
      <span class="mt-1 text-lg" style="font-family: {previewFamily[font]}" aria-hidden="true">The oracle speaks</span>
    {/snippet}
  </SegmentedPicker>
</div>
