<script lang="ts">
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import HomeActions from "./HomeActions.svelte";
  import { storage } from "$lib/storage";
  import { SITE_TITLE, SITE_DESCRIPTION_SHORT } from "@/lib/constants";

  let { data }: { data: PageData } = $props();

  let soloLabel = $state("Start quiz");
  onMount(() => {
    try {
      const raw = storage.getSoloState();
      if (raw) {
        const s = JSON.parse(raw);
        if (s.phase === "playing") soloLabel = "Continue quiz";
      }
    } catch {}
  });
</script>

<Metatags title={SITE_TITLE} description={SITE_DESCRIPTION_SHORT} />

<div class="flex-1 flex flex-col gap-4 self-center justify-center items-stretch text-center w-full max-w-md">
  <Button href="/solo" variant="primary" intent="cta">{soloLabel}</Button>
  <HomeActions host={data.host} />
  <Button href="/join" variant="outline" intent="cta">Join quiz</Button>
</div>
