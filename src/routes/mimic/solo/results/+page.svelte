<script lang="ts">
  import RealPage from "@/routes/(app)/solo/results/+page.svelte";

  // The real page gates its board CTAs on layout data; the mimic mirror
  // inherits the same resolved flags, so the fixture shows what a player sees.
  let { data } = $props();
</script>

<RealPage {data} />
