<script lang="ts">
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import { hasPower } from "@orakl/shared";
  import ManageQuestionRatings from "./ManageQuestionRatings.svelte";

  let { data }: { data: PageData } = $props();

  const canPublish = $derived(data.user ? hasPower(data.user, "can-publish-questions") : false);
</script>

<Metatags title="Question ratings" description="See how players rate built-in and promoted questions." />

<ManageQuestionRatings
  initial={data.initial}
  initialHasMore={data.initialHasMore}
  initialPage={data.page}
  {canPublish}
/>
