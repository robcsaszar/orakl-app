<script lang="ts">
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Drawer from "$lib/components/ui/drawer/index.js";

	interface Props {
		id: string;
		open: boolean;
		hasTitle?: boolean;
		title?: Snippet;
		footer?: Snippet;
		children?: Snippet;
		ariaLabel?: string;
		panelClass?: string;
		bodyClass?: string;
		footerClass?: string;
		/** Desktop dialog gains a drag handle to freely reposition it. Mobile's
		 *  drawer already drags (to dismiss) regardless — this only adds the
		 *  desktop behavior. */
		draggable?: boolean;
		/** `drawer` pins the bottom sheet on every viewport (no media query). */
		mode?: "auto" | "drawer";
		onClose?: () => void;
	}

	let {
		id,
		open,
		hasTitle = false,
		title,
		footer,
		children,
		ariaLabel,
		panelClass = "",
		bodyClass = "",
		footerClass = "",
		draggable = false,
		mode = "auto",
		onClose,
	}: Props = $props();

	const DESKTOP_QUERY =
		"(min-width: 1024px), ((min-width: 768px) and (orientation: landscape))";

	let isDesktop = $state(false);

	onMount(() => {
		if (mode === "drawer" || typeof window.matchMedia !== "function") return;
		const media = window.matchMedia(DESKTOP_QUERY);
		const sync = () => {
			isDesktop = media.matches;
		};
		sync();
		media.addEventListener("change", sync);
		return () => media.removeEventListener("change", sync);
	});

	// Bridge: writable derived the primitives control via bind:open — tracks
	// the parent prop, overridden locally when the primitive closes itself;
	// notifies parent via onClose.
	let _open = $derived(open);
	$effect(() => {
		if (!_open && open) onClose?.();
	});

	const labelled = $derived(hasTitle || !!title);
	const bodyClasses = $derived(
		["min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 sm:px-5", bodyClass]
			.filter(Boolean)
			.join(" "),
	);
</script>

{#if isDesktop}
	<Dialog.Root bind:open={_open} {id} {labelled}>
		<Dialog.Content class={panelClass} {ariaLabel} {draggable}>
			{#if draggable}
				<Dialog.Handle />
			{/if}
			{#if labelled}
				<Dialog.Title>{@render title?.()}</Dialog.Title>
			{/if}
			<div class={bodyClasses}>
				{@render children?.()}
			</div>
			{#if footer}
				<Dialog.Footer class={footerClass}>
					{@render footer()}
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open={_open} {id} {labelled}>
		<Drawer.Content class={panelClass} {ariaLabel}>
			<Drawer.Handle />
			{#if labelled}
				<Drawer.Title>{@render title?.()}</Drawer.Title>
			{/if}
			<div class={bodyClasses}>
				{@render children?.()}
			</div>
			{#if footer}
				<Drawer.Footer class={footerClass}>
					{@render footer()}
				</Drawer.Footer>
			{/if}
		</Drawer.Content>
	</Drawer.Root>
{/if}
