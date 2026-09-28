<script lang="ts">
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import FlagTierSection from "./FlagTierSection.svelte";
  import type { FlagTier } from "@orakl/shared";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Keyed by FlagTier, so a new tier is a type error here rather than a group
  // of flags silently missing from a page that claims to list every flag.
  const TIERS: Record<FlagTier, { title: string; hint: string }> = {
    db: {
      title: "Global",
      hint: "One state for everyone, switchable here.",
    },
    role: {
      title: "Role-targeted",
      hint: "On for the ticked roles only. Tick none and it is on for everyone.",
    },
    build: {
      title: "Build-level",
      hint: "Decided when the app is built. A disabled feature is not in the bundle, so changing one needs a rebuild and redeploy.",
    },
  };

  const groups = $derived(
    Object.entries(TIERS).map(([tier, copy]) => ({
      tier,
      ...copy,
      flags: data.flags.filter((f) => f.tier === tier),
    })),
  );
</script>

<Metatags title="Feature flags" description="Every feature flag and its current state." />

<div class="flex flex-col gap-8 py-8">
  <header class="flex flex-col gap-2">
    <h1 class="text-lg font-semibold">Feature flags</h1>
    <p class="text-foreground-darker font-sans max-w-prose">
      Every flag in the app, grouped by what governs it. A flag you switch here
      reaches players within five minutes.
    </p>
  </header>

  {#each groups as group (group.tier)}
    <FlagTierSection
      title={group.title}
      hint={group.hint}
      flags={group.flags}
      toggleable={group.tier === "db" || group.tier === "role"}
      targetable={group.tier === "role"}
    />
  {/each}
</div>
