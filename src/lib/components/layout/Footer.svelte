<script lang="ts">
import type { AnalyticsState } from "@orakl/shared";
  import { cn } from "tailwind-variants";
  import Link from "$lib/components/ui/Link.svelte";
  import AnalyticsControl from "./AnalyticsControl.svelte";
  import UseCaseNotice from "./UseCaseNotice.svelte";
  
  import type { UseCaseId } from "@/lib/legal/ledger.js";

  /**
   * The footer every route renders (map #840, decision #13). `showNav` picks
   * the full variant (legal nav, analytics control, copyright, version) or
   * the compact one-liner used where nav is hidden — live game phases, auth
   * screens, the display. Both carry the privacy-policy link and the
   * analytics control; a collection point adds the use-case notice.
   */
  let {
    class: className = "",
    showNav = true,
    useCases = [],
    pathname = "/",
    analytics,
  }: {
    class?: string;
    showNav?: boolean;
    useCases?: UseCaseId[];
    pathname?: string;
    analytics?: AnalyticsState;
  } = $props();

  const linkClass = "text-sm font-sans text-foreground-darker";
</script>

{#if showNav}
  <footer class={cn("flex w-full flex-col items-center gap-4 py-10", className)}>
    <nav class="flex flex-wrap items-center justify-center gap-4" aria-label="Legal">
      <span class="inline-flex items-center gap-1">
        <Link href="/legal/privacy" class={linkClass}>Privacy</Link>
        <UseCaseNotice {useCases} {pathname} />
      </span>
      <Link href="/legal/terms" class={linkClass}>Terms</Link>
      <span class="inline-flex items-center gap-1">
        <Link href="/legal/cookies" class={linkClass}>Cookies</Link>
        {#if analytics}
          <AnalyticsControl {analytics} variant="inline" />
        {/if}
      </span>
    </nav>
    <span class="text-sm font-sans text-foreground-darker">
      &copy; {new Date().getFullYear()} Orakl. All rights reserved.
    </span>
    <span class="text-xs font-mono text-foreground-darker/50">
      v{__APP_VERSION__} &middot; {__BUILD_DATE__}
    </span>
  </footer>
{:else}
  <footer
    class={cn(
      "flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 py-3 text-xs",
      className,
    )}
    data-variant="compact"
  >
    <span class="inline-flex items-center gap-1">
      <Link href="/legal/privacy" class="text-xs font-sans text-foreground-darker">Privacy</Link>
      <UseCaseNotice {useCases} {pathname} />
    </span>
    {#if analytics}
      <AnalyticsControl {analytics} variant="inline" />
    {/if}
  </footer>
{/if}
