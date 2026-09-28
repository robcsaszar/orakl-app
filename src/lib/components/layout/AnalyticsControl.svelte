<script lang="ts">
import type { AnalyticsState } from "@orakl/shared";
  import Button from "$lib/components/ui/Button.svelte";
  import IconPopover from "$lib/components/ui/IconPopover.svelte";
  
  import { reload } from "@/lib/reload.js";
  import { toast } from "@/lib/toast.js";

  /**
   * Analytics opt-out control (decision #12). `card` is the profile-page form;
   * `inline` is the footer's icon + popover — an eye-free on/off glyph that
   * tells the viewer whether they are counted, and offers the toggle unless
   * their browser already asked not to be tracked.
   */
  let {
    analytics,
    variant = "card",
  }: { analytics: AnalyticsState; variant?: "card" | "inline" } = $props();
  let saving = $state(false);

  const tracked = $derived(analytics.enabled && !analytics.browserSignal);

  /** POST the choice, then a full reload: the script tag lives in the
   *  server-rendered head, so client-side navigation alone would keep an
   *  already-loaded script tracking until the next hard load. */
  async function set(enabled: boolean) {
    saving = true;
    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        toast.error("Could not save. Try again.");
        return;
      }
      reload();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      saving = false;
    }
  }
</script>

{#if variant === "inline"}
  <IconPopover
    id="analytics-notice"
    icon={tracked ? "analytics-on" : "analytics-off"}
    ariaLabel={tracked ? "Analytics on" : "Analytics off"}
    title="Analytics"
    buttonClass="inline-flex size-6 items-center justify-center rounded-full text-foreground-darker transition-colors hover:text-foreground focus-visible:text-foreground"
  >
    <div class="flex flex-col gap-2 font-sans text-sm">
      {#if analytics.browserSignal}
        <p role="status" class="text-foreground-darker">
          Your browser asks not to be tracked, so analytics is off for you.
        </p>
      {:else if analytics.enabled}
        <p class="text-foreground-darker">
          You're counted anonymously in our page-view analytics.
        </p>
        <Button
          unstyled
          type="button"
          disabled={saving}
          onclick={() => set(false)}
          class="self-start underline decoration-dotted underline-offset-2 text-foreground-darker hover:text-foreground focus-visible:text-foreground"
          >Turn off</Button
        >
      {:else}
        <p role="status" class="text-foreground-darker">
          Analytics is off for you. Nothing about your visit is counted.
        </p>
        <Button
          unstyled
          type="button"
          disabled={saving}
          onclick={() => set(true)}
          class="self-start underline decoration-dotted underline-offset-2 text-foreground-darker hover:text-foreground focus-visible:text-foreground"
          >Turn on</Button
        >
      {/if}
    </div>
  </IconPopover>
{:else if analytics.browserSignal}
  <p role="status" class="text-foreground-darker font-sans text-sm">
    Your browser asks not to be tracked, so analytics is off for you.
  </p>
{:else if analytics.enabled}
  <Button variant="secondary" disabled={saving} onclick={() => set(false)}
    >Turn off analytics</Button
  >
{:else}
  <p role="status" class="text-foreground-darker font-sans text-sm">
    Analytics is off.
  </p>
  <Button variant="secondary" disabled={saving} onclick={() => set(true)}
    >Turn on analytics</Button
  >
{/if}
