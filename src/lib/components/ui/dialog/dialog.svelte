<script lang="ts">
	import type { Snippet } from "svelte";
	import { setDialogRootCtx } from "./dialog-context.js";

	const uid = $props.id();

	let {
		open = $bindable(false),
		id = uid,
		labelled = false,
		children,
	}: {
		open?: boolean;
		id?: string;
		labelled?: boolean;
		children?: Snippet;
	} = $props();

	setDialogRootCtx({
		get open() {
			return open;
		},
		get id() {
			return id;
		},
		get labelled() {
			return labelled;
		},
		close() {
			open = false;
		},
	});
</script>

{@render children?.()}
