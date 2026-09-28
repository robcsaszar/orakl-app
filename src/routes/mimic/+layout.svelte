<script lang="ts">
  import type { Snippet } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { getPageConfig } from "$lib/page-config";
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import Footer from "$lib/components/layout/Footer.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import DevToolbar from "./DevToolbar.svelte";
  import EndSessionButton from '$lib/components/layout/EndSessionButton.svelte';

  let {
    children,
    data,
  }: {
    children: Snippet;
    data: import("./$types").LayoutData & { user: { role: import("@orakl/shared").UserRole } };
  } = $props();

  const config = $derived(getPageConfig(page.url.pathname));
  const footer = $derived(config.footer);
  const isPlay = $derived(
    page.url.pathname === "/mimic/quiz/play" ||
    page.url.pathname === "/mimic/solo/play" ||
    page.url.pathname === "/mimic/display/play",
  );

  function endRound() {
    const url = new URL(page.url);
    url.searchParams.set("state", "correct");
    goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
  }
</script>

{#snippet playAction()}
  <EndSessionButton
    label="End round"
    onConfirm={endRound}
  />
{/snippet}

<div class="isolate flex flex-col min-h-dvh">
  <AppHeader config={config.header} user={data.user} uiFlags={data.uiFlags} class="z-30" rightAction={isPlay ? playAction : undefined} />
  <main class="z-10 container w-full max-w-page relative flex flex-col gap-8 flex-1 md:px-0 px-8">
    {@render children()}
  </main>
  <Footer
    showNav={footer.showNav}
    useCases={footer.useCases}
    pathname={page.url.pathname}
    analytics={page.data.analytics}
  />
</div>

<DevToolbar />
