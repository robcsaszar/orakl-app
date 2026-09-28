<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { getPageConfig } from "$lib/page-config";
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import Footer from "$lib/components/layout/Footer.svelte";

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

<div class="isolate flex flex-col min-h-dvh">
  <AppHeader config={config.header} user={data.user} uiFlags={data.uiFlags} />
  <main class="z-10 container w-full max-w-page relative flex flex-col gap-8 flex-1 md:px-0 px-8 items-center justify-center pb-[10vh]">
    {@render children()}
  </main>
  <Footer
    showNav={footer.showNav}
    useCases={footer.useCases}
    pathname={page.url.pathname}
    analytics={page.data.analytics}
  />
</div>
