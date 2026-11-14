<!--
  The frame every part of the sky controls sits in: a card at the bottom left
  (the bottom half of a phone); a top row with the Sky | Stars | Clouds | Birds
  tabs, the open part's tools, and the history and save tools that are one for
  all parts; and a foot bar for the hint of the setting in use.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "@/lib/components/ui/Button.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import Tabs from "@/lib/components/ui/Tabs.svelte";
  import SkyBarTool from "./SkyBarTool.svelte";
  import SkyHistory from "./SkyHistory.svelte";
  import SkySave from "./SkySave.svelte";
  import { skyHint, skyView, steadySliders } from "./sky-panel.svelte";

  /** Opens a view, or goes back to the settings when it is the one open. */
  const toggle = (view: "history" | "save") => (skyView.view = skyView.view === view ? "settings" : view);

  interface Mode {
    key: string;
    label: string;
  }

  let {
    mode,
    modes,
    onmode,
    open = $bindable(true),
    wide = false,
    savedNote = false,
    tools,
    children,
  }: {
    /** The half that is open. */
    mode: Mode;
    /** Every half there is; the switch shows when there is more than one. */
    modes: Mode[];
    onmode?: (key: string) => void;
    open?: boolean;
    /** Twice the width, for a view that needs the room. */
    wide?: boolean;
    /** Shows "saved" in the foot bar for a moment. */
    savedNote?: boolean;
    tools: Snippet;
    children: Snippet;
  } = $props();
</script>

{#if !open}
  <Button variant="outline" intent="compact" radius="rounded" class="fixed bottom-4 left-4 z-50 bg-background/95 font-serif text-base" onclick={() => (open = true)}>
    {mode.label}
  </Button>
{:else}
  <Card
    padding="none"
    variant="ground"
    role="region"
    aria-label="{mode.label} controls"
    tabindex={-1}
    class="fixed z-50 gap-0 overflow-hidden border-secondary/40 bg-background/95 font-sans shadow-2xl backdrop-blur-md focus-visible:outline-hidden max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[50dvh] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 sm:bottom-4 sm:left-4 sm:h-[min(56rem,calc(100dvh-2rem))] sm:max-w-[calc(100vw-2rem)] {wide
      ? 'sm:w-[64rem]'
      : 'sm:w-[36rem]'}"
  >
    <Tabs
      tabs={modes.length ? modes : [mode]}
      selected={mode.key}
      onSelect={(key) => onmode?.(key)}
      label="Which part of the sky to change"
      class="min-h-0 flex-1 gap-0 pt-2 max-sm:pt-1"
      bleed="pl-2 max-sm:pl-1"
      panelClass="flex min-h-0 flex-1 flex-col"
    >
      {#snippet aside()}
        <div class="flex items-center pr-3 max-sm:pr-1.5" role="toolbar" aria-label="{mode.label} tools">
          {@render tools()}
          <span class="mx-1 h-5 w-px bg-secondary/20 max-sm:hidden" aria-hidden="true"></span>
          <SkyBarTool name="tabler/history" label="History of the whole sky" onclick={() => toggle("history")} pressed={skyView.view === "history"} />
          <SkyBarTool name="tabler/upload" label="Save and share the whole sky" onclick={() => toggle("save")} pressed={skyView.view === "save"} />
          <span class="mx-1 h-5 w-px bg-secondary/20 max-sm:hidden" aria-hidden="true"></span>
          <SkyBarTool name="tabler/x" label="Hide the controls (Esc)" onclick={() => (open = false)} />
        </div>
      {/snippet}
      {#snippet panel()}
        {#if skyView.view === "history"}
          <SkyHistory />
        {:else if skyView.view === "save"}
          <SkySave />
        {:else}
          <!-- Sliders let a finger scroll up and down over them, and take back a change a scroll made. -->
          <div class="contents [&_input[type=range]]:touch-pan-y" use:steadySliders>
            {@render children()}
          </div>
        {/if}
      {/snippet}
    </Tabs>

    <!-- Always two lines high and set from the top, so neither the panel nor the hint's first line moves when a hint shows or wraps. -->
    <p class="flex h-[calc(2lh+1rem)] shrink-0 items-start gap-3 border-t border-secondary/15 px-6 py-2 text-xs leading-relaxed text-foreground-darker max-sm:px-4" aria-live="off">
      <span class="line-clamp-2 min-w-0 flex-1">
      {#if skyHint.text}
        {skyHint.text}
      {:else}
        <span class="[@media(pointer:coarse)]:hidden">Point at a setting to see what it does.</span>
        <span class="[@media(pointer:fine)]:hidden">Hold a finger on a setting to see what it does.</span>
      {/if}
      </span>
      <span class="shrink-0 font-mono text-xs transition-opacity duration-300 {savedNote ? 'opacity-100' : 'opacity-0'}" aria-hidden="true">saved</span>
    </p>
  </Card>
{/if}
