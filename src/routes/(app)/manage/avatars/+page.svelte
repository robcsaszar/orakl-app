<script lang="ts">
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import ManageAvatars from "./ManageAvatars.svelte";

  let { data }: { data: PageData } = $props();
</script>

<Metatags title="Avatar management" description="Curate avatar titles, descriptions and categories." />

<h1 class="text-lg font-semibold">Avatars</h1>

<ManageAvatars
  sortedGroups={data.sortedGroups}
  categories={data.categories}
/>
