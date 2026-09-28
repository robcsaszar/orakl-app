<script lang="ts">
import type { UserPower, UserRole } from "@orakl/shared";
  import type { Snippet } from "svelte";
  
  import type { FeatureFlagName } from "@orakl/shared";
  import type { HeaderConfig } from "$lib/page-config";
  import { shouldShow, shouldShowFlag, shouldShowPhase } from "$lib/page-config";
  import { headerActionState } from "@/lib/header-action-state.svelte.js";
  import { page } from "$app/state";
  import StickyHeader from "./StickyHeader.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import Logo from "$lib/components/ui/Logo.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import BackButton from "$lib/components/ui/BackButton.svelte";
  import LogoutButton from "$lib/components/auth/LogoutButton.svelte";
  import EndSessionButton from "$lib/components/layout/EndSessionButton.svelte";
  import CastButton from "$lib/components/quiz/CastButton.svelte";

  let {
    config,
    user,
    uiFlags = {},
    // Above `main` (z-20 in the app layout), so the sticky blur band is not
    // painted over by the content it exists to mask.
    class: className = "z-30",
    leftAction,
    rightAction,
  }: {
    config: HeaderConfig;
    user: { role: UserRole; powers?: UserPower[] };
    /** Flag states for `showWhenFlag` entries; an absent flag reads as off. */
    uiFlags?: Partial<Record<FeatureFlagName, boolean>>;
    class?: string;
    leftAction?: Snippet;
    rightAction?: Snippet;
  } = $props();

  function passesGates(l: {
    showWhen?: UserRole;
    showWhenPower?: UserPower;
    showWhenFlag?: FeatureFlagName;
    hideWhen?: UserRole;
    showWhenPhase?: string | string[];
  }): boolean {
    return (
      shouldShow(l.showWhen, l.hideWhen, user, l.showWhenPower) &&
      shouldShowFlag(l.showWhenFlag, uiFlags) &&
      shouldShowPhase(l.showWhenPhase, headerActionState.phase)
    );
  }

  const filteredLeft = $derived(config.leftLinks?.filter(passesGates) ?? []);
  const filteredRight = $derived(config.rightLinks?.filter(passesGates) ?? []);
  function isNavActive(href: string): boolean {
    const p = page.url.pathname;
    return p === href || p.startsWith(`${href}/`);
  }

  const hasNavContent = $derived(
    !!leftAction ||
      !!config.back ||
      filteredLeft.length > 0 ||
      filteredRight.length > 0 ||
      !!config.rightBadge ||
      !!rightAction,
  );
</script>

{#if !config.hidden}
  {#if config.showWordmark}
    <header id="page-header" class="relative flex w-full flex-col items-center gap-4 py-4 z-30">
      <Logo id="header-logotype" class="z-30" variant="wordmark" />
    </header>
  {/if}
  {#snippet markLogo()}
    {#if config.href}
      <Link href={config.href} aria-label="Home" class="contents">
        <Logo variant="mark" size="sm" />
      </Link>
    {:else}
      <span><Logo variant="mark" size="sm" /></span>
    {/if}
  {/snippet}
  <StickyHeader class={className} logo={config.showWordmark ? undefined : markLogo}>
    {#if hasNavContent}
      <div class="flex items-center justify-between w-full gap-8 py-4 flex-wrap">
        <div class="flex items-center gap-4">
          {#if leftAction}
            {@render leftAction()}
          {:else if config.back}
            <BackButton href={config.back} />
          {:else}
            {#each filteredLeft as link}
              {#if link.type === "link"}
                <Link href={link.href} active={isNavActive(link.href)}>
                  {#if link.icon}
                    <Icon name={link.icon} />
                  {/if}
                  {link.label}
                </Link>
              {:else if link.type === "action"}
                <EndSessionButton
                  label={link.label}
                  onConfirm={() => headerActionState.actions[link.action]?.()}
                />
              {:else if link.type === "cast"}
                <CastButton size="sm" register="header" />
              {/if}
            {/each}
          {/if}
        </div>
        <div class="flex gap-3 items-center group">
          {#if config.rightBadge}
            <div class="items-center gap-3 md:flex hidden">
              {#if config.rightBadge.label}
                <span
                  class="md:opacity-0 transition-opacity duration-500 ease-in-out md:group-hover:opacity-100 font-sans"
                >
                  {config.rightBadge.label}
                </span>
              {/if}
              <Icon name={config.rightBadge.icon} class="size-8" />
            </div>
          {/if}
          {#if rightAction}
            {@render rightAction()}
          {:else}
            {#each filteredRight as link}
              {#if link.type === "logout"}
                <LogoutButton />
              {:else if link.type === "link"}
                <Link href={link.href} active={isNavActive(link.href)}>
                  {link.label}
                  {#if link.icon}
                    <Icon name={link.icon} />
                  {/if}
                </Link>
              {:else if link.type === "action"}
                <EndSessionButton
                  label={link.label}
                  onConfirm={() => headerActionState.actions[link.action]?.()}
                />
              {:else if link.type === "cast"}
                <CastButton size="sm" register="header" />
              {/if}
            {/each}
          {/if}
        </div>
      </div>
    {:else}
      <div class="py-5"></div>
    {/if}
  </StickyHeader>
{/if}
