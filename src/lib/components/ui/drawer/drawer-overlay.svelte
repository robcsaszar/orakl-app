<script lang="ts">
	import { fade } from "svelte/transition";
	import { getDrawerRootCtx } from "./drawer-context.js";

	const ctx = getDrawerRootCtx();
</script>

<div
	class="fixed inset-0 z-50 bg-background/74 supports-[backdrop-filter]:bg-background/66 supports-[backdrop-filter]:backdrop-blur-[3px]"
	transition:fade={{ duration: 160 }}
	onclick={ctx.close}
	aria-hidden="true"
></div>
