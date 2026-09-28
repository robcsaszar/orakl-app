<script lang="ts">
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import ManageAuthoredQuestions from "./ManageAuthoredQuestions.svelte";

  let { data }: { data: PageData } = $props();
</script>

<Metatags title="Authored questions" description="Every question curators have written, and who wrote it." />

<ManageAuthoredQuestions
  initial={data.initial}
  page={data.page}
  filters={data.filters}
  authors={data.authors}
  categories={data.categories}
/>
