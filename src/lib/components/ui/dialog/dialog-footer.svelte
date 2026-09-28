<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		children,
		class: extraClass = "",
	}: { children?: Snippet; class?: string } = $props();
</script>

<div
	class={[
		"shrink-0 border-t border-background-lighter/35 bg-background/92 px-4 py-3 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-sm sm:px-5",
		extraClass,
	]
		.filter(Boolean)
		.join(" ")}
>
	{@render children?.()}
</div>
