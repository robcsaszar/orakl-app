<script lang="ts">
  import { untrack } from "svelte";
  import IconPopover from "$lib/components/ui/IconPopover.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import { anchorFor, LEDGER, type UseCaseId } from "@/lib/legal/ledger.js";
  import { prefersReducedMotion } from "@/lib/motion-prefs.js";
  import { getStorageItem, setStorageItem } from "@/lib/storage.js";

  /**
   * Use-case notice (map #840, decisions #6, #13): the eye beside the footer's
   * privacy link on a collection point. Its popover carries one sentence per
   * use case the route declares in `page-config`, each linking to that use
   * case's anchor on the privacy policy. The icon shines on the first visit to
   * each collection point per viewer, never under reduced motion. The footer
   * lives in a persistent layout, so everything keys off `pathname`.
   */
  let {
    useCases,
    pathname,
  }: {
    useCases: UseCaseId[];
    /** The collection point the shine is remembered for. */
    pathname: string;
  } = $props();

  const rows = $derived(
    useCases
      .map((id) => LEDGER.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined),
  );

  const popoverId = "use-case-notice";
  let shine = $state(false);
  let open = $state(false);

  function seenPaths(): string[] {
    try {
      return JSON.parse(getStorageItem("orakl-notice-seen") ?? "[]");
    } catch {
      return [];
    }
  }

  // Runs on mount and again on every client-side navigation: close the panel,
  // then shine once for a collection point this viewer hasn't met.
  $effect(() => {
    const path = pathname;
    const hasRows = rows.length > 0;
    // untrack: closing the panel / clearing shine must not re-run this effect.
    untrack(() => {
      open = false;
      shine = false;
    });
    if (!hasRows) return;
    const reduced = prefersReducedMotion();
    const seen = seenPaths();
    if (seen.includes(path)) return;
    if (!reduced) shine = true;
    setStorageItem("orakl-notice-seen", JSON.stringify([...seen, path]));
  });

  // First interaction ends the shine.
  $effect(() => {
    if (open) shine = false;
  });
</script>

{#if rows.length > 0}
  <IconPopover
    bind:open
    id={popoverId}
    icon="eye"
    ariaLabel="What this page collects"
    title="What this page collects"
    {shine}
    buttonClass="use-case-i inline-flex size-6 items-center justify-center rounded-full text-foreground-darker transition-colors hover:text-foreground focus-visible:text-foreground"
  >
    <ul class="flex flex-col gap-2 font-sans text-sm">
      {#each rows as row (row.id)}
        <li class="flex flex-col gap-0.5">
          <Link
            href={`/legal/privacy#${anchorFor(row.id)}`}
            intent="inline"
            class="font-medium text-foreground"
            content="inline">{row.element}</Link
          >
          <span class="text-foreground-darker">{row.sentence}</span>
        </li>
      {/each}
    </ul>
  </IconPopover>
{/if}

<style>
  /* One deliberate shine on the first visit to a collection point; the
     attribute is dropped on first interaction and never set under reduced
     motion (checked before it is applied). */
  :global(.use-case-i[data-shine="true"]) {
    animation: use-case-shine 1.6s ease-out 0.4s 2;
  }
  @keyframes use-case-shine {
    0%,
    100% {
      color: inherit;
      filter: none;
    }
    40% {
      color: var(--color-primary);
      filter: drop-shadow(0 0 6px var(--color-primary));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.use-case-i[data-shine="true"]) {
      animation: none;
    }
  }
</style>
