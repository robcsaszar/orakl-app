<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		children,
	}: {
		children?: Snippet;
	} = $props();
</script>

<div class="shrink-0 border-b border-background-lighter/35 px-4 pb-3">
	{@render children?.()}
</div>
