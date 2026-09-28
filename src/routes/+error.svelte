<script lang="ts">
  import { onMount, tick } from "svelte";
  import { page } from "$app/state";
  import { invalidateAll } from "$app/navigation";
  import Card from "@/lib/components/ui/Card.svelte";
  import Button from "@/lib/components/ui/Button.svelte";
  import { toast } from "@/lib/toast";
  import { routeHistory } from "@/lib/svelte/route-history.svelte.js";
  import { buildReportMailto } from "@/lib/error-report.js";
  import { prefersReducedMotion } from "@/lib/motion-prefs.js";
  import { meta } from "data/project.settings.js";

  const is404 = $derived(page.status === 404);
  // A refusal is not a fault: it gets its own branch so it never offers
  // "Report error" or "Try again", neither of which can change the outcome.
  const is403 = $derived(page.status === 403);
  // SvelteKit always supplies a message, defaulting to a bare "Forbidden".
  // Only a refusal that named its own reason is worth showing.
  const forbiddenMessage = $derived(
    page.error?.message && page.error.message !== "Forbidden"
      ? page.error.message
      : "This page needs a permission your account doesn't hold.",
  );

  let retrying = $state(false);

  // The eyes SVG is pure SMIL (no CSS animation), so `prefers-reduced-motion`
  // can't reach it while it's loaded via <img> — img-embedded SVGs don't run
  // scripts either, so it can't self-pause. Only for that preference do we
  // fetch (bypasses the build-time svgo transform, same as the <img> src),
  // inline it, and freeze it with the SVG DOM's own pauseAnimations().
  let reducedMotion = $state(false);
  let eyesMarkup = $state("");
  let eyesContainer = $state<HTMLDivElement | undefined>(undefined);

  onMount(() => {
    if (!is404) return;
    reducedMotion = prefersReducedMotion();
    if (!reducedMotion) return;
    (async () => {
      const res = await fetch("/eyes.svg");
      eyesMarkup = await res.text();
      await tick();
      const svg = eyesContainer?.querySelector<SVGSVGElement>("svg");
      svg?.pauseAnimations();
      // t=0 lands on the closed-eye keyframe (each loop's blink trough) —
      // every eye variant is open by ~1.5s, so freeze there instead.
      svg?.setCurrentTime(1.5);
    })();
  });

  function reportError() {
    const mailto = buildReportMailto({
      supportEmail: meta.supportEmail,
      path: page.url.pathname,
      message: page.error?.message ?? "Unknown error",
      eventId: page.error?.eventId,
      stack: page.error?.stack,
      recentRoutes: routeHistory.paths,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      user: page.data.user
        ? { nickname: page.data.user.nickname, role: page.data.user.role }
        : null,
    });
    toast.info("Opening your email client…");
    window.location.href = mailto;
  }

  async function tryAgain() {
    retrying = true;
    await invalidateAll();
    retrying = false;
  }
</script>

{#if is404}
  <div class="error-enter flex min-h-[70dvh] flex-col items-center justify-center gap-8 px-4 py-16 text-center">
    <Card variant="ground" padding="none" class="w-full max-w-sm overflow-hidden">
      {#if reducedMotion}
        <div bind:this={eyesContainer} class="eyes-inline size-full">{@html eyesMarkup}</div>
      {:else}
        <img src="/eyes.svg" alt="" aria-hidden="true" class="size-full" />
      {/if}
    </Card>
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold text-balance">Lost between the pages</h1>
      <p class="text-foreground/70 max-w-sm text-pretty">
        No oracle has seen this path. It may have been sealed, moved, or never chronicled at all.
      </p>
    </div>
    <div class="flex gap-3">
      <Button variant="secondary" iconBefore="arrow-left" onclick={() => history.back()}>
        Go back
      </Button>
      <Button href="/" iconBefore="orakl">Go home</Button>
    </div>
  </div>
{:else if is403}
  <div class="error-enter flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold text-balance">Sealed to you</h1>
      <p class="text-foreground/70 max-w-sm text-pretty">
        {forbiddenMessage}
      </p>
    </div>
    <div class="flex gap-3">
      {#if routeHistory.paths.length > 1}
        <Button variant="secondary" iconBefore="arrow-left" onclick={() => history.back()}>
          Go back
        </Button>
      {/if}
      <Button href="/" iconBefore="orakl">Go home</Button>
    </div>
  </div>
{:else}
  <div class="error-enter flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold text-balance">Server error</h1>
      <p class="text-foreground/70 max-w-sm text-pretty">
        Something went wrong on our end. Sorry for the inconvenience: reach us at
        <a class="underline" href={`mailto:${meta.supportEmail}`}>{meta.supportEmail}</a> if it persists.
      </p>
    </div>
    <div class="flex flex-wrap justify-center gap-3">
      <Button variant="secondary" iconBefore="scroll" onclick={reportError}>
        Report error
      </Button>
      <Button variant="secondary" iconBefore="shuffle" loading={retrying} onclick={tryAgain}>
        Try again
      </Button>
      <Button href="/" iconBefore="orakl">Go home</Button>
    </div>
    <details class="border-secondary/10 bg-secondary/5 mt-4 w-full max-w-md rounded-2xl border-2 p-4 text-left text-sm">
      <summary class="cursor-pointer font-medium">Error details</summary>
      <dl class="text-foreground/70 mt-2 flex flex-col gap-1">
        <div><dt class="inline font-medium">Status:</dt> <dd class="inline">{page.status}</dd></div>
        <div><dt class="inline font-medium">Message:</dt> <dd class="inline">{page.error?.message}</dd></div>
        {#if page.error?.eventId}
          <div>
            <dt class="inline font-medium">Event ID:</dt>
            <dd class="inline break-all font-mono">{page.error.eventId}</dd>
          </div>
        {/if}
      </dl>
      {#if page.error?.stack}
        <pre class="mt-2 overflow-x-auto text-xs break-words whitespace-pre-wrap">{page.error.stack}</pre>
      {/if}
    </details>
  </div>
{/if}

<style>
  /* The fetched eyes.svg carries its own literal width/height="512" — override
     so it fills the card like the <img> variant does via `size-full`. */
  .eyes-inline :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .error-enter {
    opacity: 1;
    transition: opacity 240ms ease;

    @starting-style {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .error-enter {
      transform: scale(1);
      transition:
        opacity 240ms cubic-bezier(0.23, 1, 0.32, 1),
        transform 240ms cubic-bezier(0.23, 1, 0.32, 1);

      @starting-style {
        transform: scale(0.95);
      }
    }
  }
</style>
