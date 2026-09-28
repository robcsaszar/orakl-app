<script lang="ts">
	import type { Snippet } from "svelte";
	import { getDrawerRootCtx } from "./drawer-context.js";

	let { children }: { children?: Snippet } = $props();

	const ctx = getDrawerRootCtx();
</script>

<h2
	id="{ctx.id}-title"
	class="shrink-0 border-b border-background-lighter/35 px-4 pb-3 text-sm font-semibold tracking-[0.01em] text-foreground"
>
	{@render children?.()}
</h2>
