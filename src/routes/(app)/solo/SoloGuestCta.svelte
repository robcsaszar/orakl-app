<script lang="ts">
  import Button from "@/lib/components/ui/Button.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import type { Snippet } from 'svelte';
  import { cn } from 'tailwind-variants';

  interface Props {
    /** Heading line; varies by surface (setup vs results). */
    headline?: string;
    /** Supporting line under the heading. */
    subline?: string;
    /** Finished guest run to link on signup/login (saves the run to the account). */
    claimId?: string | null;
    /** Whether the persistent boards are on, and so worth promising. No
     *  default: promising a feature that is switched off is worse than a
     *  caller having to say. */
    leaderboards: boolean;
    /** Allow a third CTA as snippet. */
    ternaryCta?: Snippet;
    class?: string;
  }

  let {
    headline = "Playing as a guest",
    subline = "Sign in to unseal the full trial.",
    claimId = null,
    leaderboards,
    ternaryCta = undefined,
    class: className = "",
  }: Props = $props();

  // Carry the claim handle so the just-played run is attached to the new account.
  const q = $derived(claimId ? `?soloClaim=${encodeURIComponent(claimId)}` : "");
  const loginHref = $derived(`/login${q}`);
  const signupHref = $derived(`/signup${q}`);

  // What an account unlocks — the conversion funnel (US #16). The boards are
  // only worth promising while they are switched on.
  const perks = $derived([
    ...(leaderboards ? ["Global, weekly, and per-category leaderboards"] : []),
    "Every category, no caps",
    "Difficulty targeting and longer trials",
    "Endless survival mode",
    "Curator-crafted questions",
  ]);
</script>

<Card variant="mezzanine" padding="lg" class={cn("relative isolate flex-1 overflow-hidden", className)}>
  <Icon name="sun-detail" class="size-md text-secondary/10 md:text-secondary/20 absolute -right-8 -top-8 z-0" />
  <div class="z-10 flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <h2 class="text-xl font-bold flex items-start gap-2"><Icon name="sun" class="size-7 shrink-0" />{headline}</h2>
      <p class="text-foreground-darker">{subline}</p>
    </div>
    <ul class="flex flex-col gap-2 text-sm">
      {#each perks as perk (perk)}
        <li class="flex items-center gap-2">
          <Icon name="star" class="size-3 shrink-0" />
          {perk}
        </li>
      {/each}
    </ul>
    <div class="flex flex-wrap gap-2">
      <Button href={signupHref} variant="primary">
        Create account
      </Button>
      <Button href={loginHref} variant="secondary">
        Sign in
      </Button>
      {#if ternaryCta}
        <div class="flex items-center gap-2">
          <span class="text-sm text-foreground-darker">or</span>
          {@render ternaryCta()}
        </div>
      {/if}
    </div>
  </div>
</Card>
