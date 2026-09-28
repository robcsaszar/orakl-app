<script lang="ts">
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import ManageCategories from "./ManageCategories.svelte";

  let { data }: { data: PageData } = $props();
</script>

<Metatags title="Category management" description="Manage quiz categories, icons, and colors." />

<ManageCategories initial={data.initial} />
