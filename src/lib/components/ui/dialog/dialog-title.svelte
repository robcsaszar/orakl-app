<script lang="ts">
	import type { Snippet } from "svelte";
	import { getDialogRootCtx } from "./dialog-context.js";

	let { children }: { children?: Snippet } = $props();

	const ctx = getDialogRootCtx();
</script>

<h2
	id="{ctx.id}-title"
	class="shrink-0 border-b border-background-lighter/35 px-5 pb-4 pt-5 text-base font-semibold tracking-[0.01em] text-foreground"
>
	{@render children?.()}
</h2>
