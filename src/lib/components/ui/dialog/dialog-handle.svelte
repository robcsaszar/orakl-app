<script lang="ts">
	import { getDialogContentCtx } from "./dialog-context.js";

	const { onDragStart } = getDialogContentCtx();
</script>

<div
	role="button"
	tabindex="0"
	aria-label="Drag to move"
	class="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3"
	onpointerdown={onDragStart}
>
	<div class="h-1.5 w-12 rounded-full bg-background-lighter/85" aria-hidden="true"></div>
</div>
