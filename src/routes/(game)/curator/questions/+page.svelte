<script lang="ts">
  import CustomQuestionsPage from "./CustomQuestionsPage.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Add question — Orakl</title>
</svelte:head>

<CustomQuestionsPage
  categories={data.categories}
  ownQuestions={data.ownQuestions}
  questionsCursor={data.questionsCursor}
/>
