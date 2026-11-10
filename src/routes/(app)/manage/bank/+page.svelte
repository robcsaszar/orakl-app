<script lang="ts">
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import ManageBank from "./ManageBank.svelte";

  let { data }: { data: PageData } = $props();
</script>

<Metatags title="Question bank" description="Find and edit built-in and promoted questions." />

<ManageBank
  initial={data.initial}
  initialHasMore={data.initialHasMore}
  page={data.page}
  q={data.q}
  category={data.category}
  categories={data.categories}
/>
