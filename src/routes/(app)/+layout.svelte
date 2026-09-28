<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { getPageConfig } from "$lib/page-config";
  import { headerActionState } from "@/lib/header-action-state.svelte.js";
  import AppHeader from "$lib/components/layout/AppHeader.svelte";
  import Footer from "$lib/components/layout/Footer.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import BackButton from "$lib/components/ui/BackButton.svelte";
  import LogoutButton from "$lib/components/auth/LogoutButton.svelte";
  import EndSessionButton from "$lib/components/layout/EndSessionButton.svelte";

  let {
    children,
    data,
  }: {
    children: Snippet;
    data: import("./$types").LayoutData;
  } = $props();

  const config = $derived(getPageConfig(page.url.pathname));
  const isSoloPlay = $derived(page.url.pathname === "/solo/play");
  const footer = $derived(config.footer);
</script>

{#snippet soloPlayAction()}
  {#if headerActionState.phase === "playing"}
    <EndSessionButton
      label="End round"
      onConfirm={() => headerActionState.actions.endRound?.()}
    />
  {:else if data.user.role === "anonymous"}
    <Link href="/login">Sign in</Link>
    <Link href="/signup">Sign up</Link>
  {:else}
    <BackButton href="/" />
    <LogoutButton />
  {/if}
{/snippet}

<div class="isolate flex flex-col min-h-dvh">
  <AppHeader config={config.header} user={data.user} uiFlags={data.uiFlags} rightAction={isSoloPlay ? soloPlayAction : undefined} />
  <main class="z-20 container w-full max-w-page relative flex flex-col gap-8 flex-1 md:px-0 px-8">
    {@render children()}
  </main>
  <Footer
    class="z-10"
    showNav={footer.showNav}
    useCases={footer.useCases}
    pathname={page.url.pathname}
    analytics={page.data.analytics}
  />
</div>
