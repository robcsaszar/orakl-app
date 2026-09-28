<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { getPageConfig } from "$lib/page-config";
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import Footer from "$lib/components/layout/Footer.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import CuratorToolboxPanel from "./quiz/CuratorToolboxPanel.svelte";
  import {
    pendingCount,
    toggleToolboxRail,
    toolboxRail,
  } from "./quiz/toolbox-rail.svelte.js";
  import { MediaQuery } from "svelte/reactivity";
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";

  // The rail mounts only at the desktop breakpoint — a CSS-hidden mount would
  // still run the panel's side effects (CastButton reconnects on mount).
  const desktop = new MediaQuery("(min-width: 64rem)");
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let {
    children,
    data,
  }: {
    children: Snippet;
    data: import("./$types").LayoutData;
  } = $props();

  const config = $derived(getPageConfig(page.url.pathname));
  const footer = $derived(config.footer);
</script>

<!-- Header behaviour (which links/actions show, gated by role and/or the
     live /quiz/* journey phase) is fully declared in page-config.ts —
     AppHeader renders it directly; nothing route-specific to wire up here. -->
<div class="isolate flex flex-col min-h-dvh">
  <AppHeader config={config.header} user={data.user} uiFlags={data.uiFlags} class="z-30" />
  <!-- Row so the curator toolbox rail sits beside `main` as a real sibling:
       `main` keeps its own container/max-width and centres within the
       remaining column. The footer stays below the row, full-width. -->
  <div class="flex flex-1 items-stretch gap-6">
    <main class="z-20 container w-full max-w-page relative flex flex-col gap-8 flex-1 md:px-0 px-8">
      {@render children()}
    </main>
    {#if toolboxRail.session && desktop.current}
      <!-- Full-height sticky rail: `top` clears the sticky header, `height`
           fills to the viewport bottom. Width switches without a transition
           (layout props are never animated); the panel fades in on expand. -->
      <aside
        aria-label="Curator toolbox"
        class="z-20 sticky self-start shrink-0 overflow-y-auto overflow-x-hidden border-l border-border bg-background-lighter/18 backdrop-blur-md {toolboxRail.collapsed
          ? 'w-16 p-2'
          : 'w-80 p-4'}"
        style="top: var(--sticky-header-height, 0px); height: calc(100dvh - var(--sticky-header-height, 0px))"
      >
        <div class="mb-4 flex items-center justify-between gap-2">
          {#if !toolboxRail.collapsed}
            <h2 class="text-lg font-semibold">Curator toolbox</h2>
          {/if}
          <div class="relative">
            <Button
              variant="ghost"
              intent="icon"
              iconBefore={toolboxRail.collapsed ? "chevron-left" : "chevron-right"}
              aria-label={toolboxRail.collapsed && pendingCount(toolboxRail.session) > 0
                ? `Expand toolbox, ${pendingCount(toolboxRail.session)} pending`
                : toolboxRail.collapsed
                  ? "Expand toolbox"
                  : "Collapse toolbox"}
              aria-expanded={!toolboxRail.collapsed}
              aria-controls="curator-toolbox-rail-panel"
              onclick={toggleToolboxRail}
            />
            {#if toolboxRail.collapsed && pendingCount(toolboxRail.session) > 0}
              <span
                aria-hidden="true"
                class="absolute -right-1 -top-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-secondary-700 px-1 text-xs tabular-nums text-secondary-50 ring-2 ring-background"
              >
                {Math.min(pendingCount(toolboxRail.session), 99)}{pendingCount(toolboxRail.session) > 99 ? "+" : ""}
              </span>
            {/if}
          </div>
        </div>
        <div id="curator-toolbox-rail-panel" hidden={toolboxRail.collapsed}>
          {#if !toolboxRail.collapsed}
            <div in:fly={{ x: 8, duration: reducedMotion.current ? 0 : 200, easing: cubicOut }}>
              <CuratorToolboxPanel session={toolboxRail.session} />
            </div>
          {/if}
        </div>
        {#if toolboxRail.collapsed}
          <CuratorToolboxPanel session={toolboxRail.session} compact />
        {/if}
      </aside>
    {/if}
  </div>
  <Footer
    class="z-10"
    showNav={footer.showNav}
    useCases={footer.useCases}
    pathname={page.url.pathname}
    analytics={page.data.analytics}
  />
</div>
