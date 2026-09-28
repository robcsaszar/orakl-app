<script lang="ts">
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import ManageFlaggedQuestions from "./ManageFlaggedQuestions.svelte";
  import type { FlagStatus } from "@orakl/protocol";

  let { data }: { data: PageData } = $props();

  // SvelteKit's generated PageData widens the literal union from the load
  // return to `string` — narrow it back at this boundary rather than fight
  // the generated $types.
  const initialStatus = $derived(data.statusFilter as FlagStatus | "all");
</script>

<Metatags title="Flagged questions" description="Review questions players have flagged for issues." />

<ManageFlaggedQuestions
  initial={data.initial}
  initialHasMore={data.initialHasMore}
  {initialStatus}
  initialPage={data.page}
/>
