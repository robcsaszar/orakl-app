<script lang="ts">
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import ManageNotices from "./ManageNotices.svelte";

  let { data }: { data: PageData } = $props();
</script>

<Metatags title="Image notices" description="Review image notices and decide each within 72 hours." />

<ManageNotices initial={data.notices} />
