<script lang="ts">
import { hasPower } from "@orakl/shared";
import type { SkyPhase } from "@orakl/shared";
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import type { LayoutData } from "./$types";
  import "@/styles/global.css";
  import "$lib/styles/fonts.css";
  
  import { subscribeSkyPhase } from "@/lib/sky-phase";
  import { recordRoute } from "@/lib/svelte/route-history.svelte.js";
  import { setPowerUser } from "@/lib/svelte/powerUser.svelte.js";
  
  import { Toaster } from "svelte-sonner";
  import Tooltip from "$lib/components/ui/Tooltip.svelte";
  import FeedbackWidget from "./FeedbackWidget.svelte";

  let { children, data }: { children: Snippet; data: LayoutData } = $props();

  // `is-power-user` strips every field-description info-i, app-wide. Published
  // from the one layout every page sits under, as a getter so a grant that
  // lands mid-session takes effect on the next navigation.
  setPowerUser(() => hasPower(data.user, "is-power-user"));

  afterNavigate(({ to }) => {
    if (to?.url.pathname) recordRoute(to.url.pathname);
  });

  // Theme changes update the `data-sky-phase` DOM attribute but don't
  // invalidate server `data`, so track the live phase (seeded from SSR data to
  // avoid a hydration mismatch) to re-derive what shows without a refresh.
  // svelte-ignore state_referenced_locally
  let livePhase = $state<SkyPhase>(data.theme.phase);

  onMount(() => subscribeSkyPhase((p) => (livePhase = p)));

  const faviconHref = import.meta.env.DEV ? "/favicon-dev.svg" : "/favicon.svg";

  // Build-level flag (map #859, decision 5). The import() sits inside the
  // guard, so with __FEATURE_SKY__ false the sky chunk — Background, Birds,
  // DynamicBackground and the bundled clouds.png — never enters the bundle.
  // (static/clouds.png is a separate copied-verbatim asset, unaffected.) The
  // cost of the dynamic boundary is that the decorative, aria-hidden sky
  // paints after hydration rather than during SSR.
  const skyLayer = __FEATURE_SKY__
    ? import("$lib/components/SkyLayer.svelte")
    : null;
</script>

<svelte:head>
  <link rel="icon" type="image/svg+xml" href={faviconHref} />
</svelte:head>

<div class="fixed inset-0 isolate overflow-hidden pointer-events-none" aria-hidden="true">
  {#if skyLayer}
    {#await skyLayer then { default: SkyLayer }}
      <SkyLayer phase={livePhase} dynamic={data.theme.mode === "dynamic"} />
    {:catch}
      <!-- Decorative; a failed chunk load just means no sky. -->
    {/await}
  {/if}
  <div class="bg-noise-10 absolute inset-0 z-30 opacity-50"></div>
</div>

<div class="relative z-10">
  {@render children()}
</div>
<Toaster position="bottom-right" theme="dark" />
<Tooltip />
{#if data.feedbackWidgetEnabled}
  <FeedbackWidget />
{/if}
