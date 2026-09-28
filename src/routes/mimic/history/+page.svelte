<script lang="ts">
  import RealPage from "@/routes/(app)/history/+page.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<RealPage {data} />
