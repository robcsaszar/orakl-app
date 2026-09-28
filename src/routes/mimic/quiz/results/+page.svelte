<script lang="ts">
  import type { PageData } from "./$types";
  // Cast: real page only reads data.claimed + data.isAnonymousPlayer at runtime;
  // the accumulated (game) layout fields are not accessed.
  import RealPage from "@/routes/(game)/quiz/results/+page.svelte";

  let { data }: { data: PageData } = $props();
</script>

<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
<RealPage data={data as any} />
