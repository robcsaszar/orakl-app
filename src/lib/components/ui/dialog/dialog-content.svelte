<script lang="ts">
	import { onDestroy, onMount, tick } from "svelte";
	import { fade, scale } from "svelte/transition";
	import type { Snippet } from "svelte";
	import { cn } from "tailwind-variants";
	import { getDialogRootCtx, setDialogContentCtx } from "./dialog-context.js";
	import { lockBodyScroll } from "$lib/overlay-lock.js";

	let {
		children,
		class: extraClass = "",
		ariaLabel,
		draggable = false,
	}: { children?: Snippet; class?: string; ariaLabel?: string; draggable?: boolean } =
		$props();

	const ctx = getDialogRootCtx();
	const DRAG_MARGIN = 16;

	let host: HTMLDivElement | undefined = $state(undefined);
	let panel: HTMLElement | null = $state(null);
	let restoreFocusEl: HTMLElement | null = null;

	// Free-reposition drag (opt-in via `draggable`) — a plain 1:1 pointer
	// follow with no snap/settle, reset every time the dialog re-opens since
	// `translateX`/`translateY` are local state torn down with the `{#if
	// ctx.open}` block below. Distinct from the FAB's drag engine
	// (`draggableFab.svelte.ts`): no click-vs-drag disambiguation is needed
	// here since the handle has no separate "tap" behavior, and there's no
	// edge-snap-on-release, so a much smaller pointer tracker suffices.
	let translateX = $state(0);
	let translateY = $state(0);
	let isDragging = $state(false);
	let _dragPointerId = -1;
	let _dragStartPx = 0;
	let _dragStartPy = 0;
	let _dragStartX = 0;
	let _dragStartY = 0;

	function onDragStart(event: PointerEvent) {
		if (!draggable || !panel) return;
		_dragPointerId = event.pointerId;
		isDragging = true;
		_dragStartPx = event.clientX;
		_dragStartPy = event.clientY;
		_dragStartX = translateX;
		_dragStartY = translateY;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

		const rect = panel.getBoundingClientRect();
		// Bounds computed once at drag start (relative to the untransformed
		// rect) so the whole panel always stays reachable on-screen.
		const minX = DRAG_MARGIN - rect.left + translateX;
		const maxX = window.innerWidth - DRAG_MARGIN - rect.right + translateX;
		const minY = DRAG_MARGIN - rect.top + translateY;
		const maxY = window.innerHeight - DRAG_MARGIN - rect.bottom + translateY;

		const onMove = (e: PointerEvent) => {
			if (e.pointerId !== _dragPointerId) return;
			translateX = Math.max(minX, Math.min(maxX, _dragStartX + (e.clientX - _dragStartPx)));
			translateY = Math.max(minY, Math.min(maxY, _dragStartY + (e.clientY - _dragStartPy)));
		};
		const onUp = (e: PointerEvent) => {
			if (e.pointerId !== _dragPointerId) return;
			_dragPointerId = -1;
			isDragging = false;
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onUp);
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onUp);
	}

	setDialogContentCtx({ onDragStart });

	const dragStyle = $derived(
		draggable
			? `transform: translate(${translateX}px, ${translateY}px); transition: none; user-select: ${isDragging ? "none" : "auto"};`
			: "",
	);

	onMount(() => {
		if (host) document.body.appendChild(host);
	});

	onDestroy(() => {
		host?.remove();
	});

	$effect(() => {
		if (!ctx.open) return;

		restoreFocusEl =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;

		const main = document.querySelector("main");
		const previousInert = main instanceof HTMLElement ? main.inert : false;
		if (main instanceof HTMLElement) main.inert = true;

		const unlockBody = lockBodyScroll();

		tick().then(() => {
			if (!ctx.open) return;
			const focusable = panel?.querySelector<HTMLElement>(
				"button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
			);
			focusable?.focus();
		});

		return () => {
			unlockBody();
			if (main instanceof HTMLElement) main.inert = previousInert;
			restoreFocusEl?.focus();
			translateX = 0;
			translateY = 0;
		};
	});

	$effect(() => {
		if (!ctx.open) return;
		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape") ctx.close();
		};
		window.addEventListener("keydown", onKeydown);
		return () => window.removeEventListener("keydown", onKeydown);
	});
</script>

<div bind:this={host}>
	{#if ctx.open}
		<div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
			<div
				class="pointer-events-auto absolute inset-0 bg-background/74 supports-[backdrop-filter]:bg-background/66 supports-[backdrop-filter]:backdrop-blur-[3px]"
				transition:fade={{ duration: 160 }}
				onclick={ctx.close}
				aria-hidden="true"
			></div>
			<div
				bind:this={panel}
				role="dialog"
				aria-modal="true"
				aria-labelledby={ctx.labelled ? `${ctx.id}-title` : undefined}
				aria-label={ctx.labelled ? undefined : (ariaLabel ?? "Dialog")}
				class={cn(
					"pointer-events-auto relative mx-auto flex max-h-[min(92dvh,48rem)] w-full max-w-[min(42rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-[1.75rem] border border-background-lighter/45 bg-background/96 text-foreground shadow-2xl supports-[backdrop-filter]:bg-background/92 supports-[backdrop-filter]:backdrop-blur-sm",
					extraClass,
				)}
				style={dragStyle}
				in:scale={{ start: 0.97, duration: 220 }}
				out:scale={{ start: 0.97, duration: 160 }}
			>
				{@render children?.()}
			</div>
		</div>
	{/if}
</div>
