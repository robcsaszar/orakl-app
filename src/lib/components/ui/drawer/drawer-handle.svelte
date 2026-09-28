<script lang="ts">
	import { getDrawerRootCtx, getDrawerContentCtx } from "./drawer-context.js";

	const root = getDrawerRootCtx();
	const { onDragStart } = getDrawerContentCtx();
</script>

<div
	role="button"
	tabindex="0"
	aria-label="Close drawer"
	class="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3"
	onpointerdown={onDragStart}
	onkeydown={(e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			root.close();
		}
	}}
>
	<div class="h-1.5 w-12 rounded-full bg-background-lighter/85" aria-hidden="true"></div>
</div>
