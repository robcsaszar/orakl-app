<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import type { Snippet } from "svelte";

	let { children }: { children?: Snippet } = $props();

	let host: HTMLDivElement | undefined = $state(undefined);

	onMount(() => {
		if (host) document.body.appendChild(host);
	});

	onDestroy(() => {
		host?.remove();
	});
</script>

<div bind:this={host}>
	{@render children?.()}
</div>
