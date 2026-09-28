<script lang="ts">
	import { onDestroy, tick } from "svelte";
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
	import { cn } from "tailwind-variants";
	import DrawerPortal from "./drawer-portal.svelte";
	import DrawerOverlay from "./drawer-overlay.svelte";
	import { getDrawerRootCtx, setDrawerContentCtx } from "./drawer-context.js";
	import { lockBodyScroll } from "$lib/overlay-lock.js";

	let {
		children,
		class: extraClass = "",
		ariaLabel,
	}: { children?: Snippet; class?: string; ariaLabel?: string } = $props();

	const ctx = getDrawerRootCtx();

	let panel: HTMLElement | null = $state(null);
	let isDragging = $state(false);
	let dragStartY = $state(0);
	let translateY = $state(0);
	let panelHeight = $state(0);
	let restoreFocusEl: HTMLElement | null = null;
	let pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
	let pointerUpHandler: (() => void) | null = null;

	const panelStyle = $derived(
		`transform: translateY(${translateY}px); transition: transform ${isDragging ? 0 : 220}ms cubic-bezier(0.23, 1, 0.32, 1);`,
	);

	function releaseDragListeners() {
		if (pointerMoveHandler) {
			window.removeEventListener("pointermove", pointerMoveHandler);
			pointerMoveHandler = null;
		}
		if (pointerUpHandler) {
			window.removeEventListener("pointerup", pointerUpHandler);
			window.removeEventListener("pointercancel", pointerUpHandler);
			pointerUpHandler = null;
		}
	}

	function onDragStart(event: PointerEvent) {
		isDragging = true;
		dragStartY = event.clientY;
		panelHeight = panel?.offsetHeight ?? 0;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

		pointerMoveHandler = (e: PointerEvent) => {
			if (!isDragging) return;
			translateY = Math.max(0, e.clientY - dragStartY);
		};
		pointerUpHandler = () => {
			if (!isDragging) return;
			isDragging = false;
			releaseDragListeners();
			if (translateY > panelHeight * 0.35) {
				ctx.close();
				return;
			}
			translateY = 0;
		};
		window.addEventListener("pointermove", pointerMoveHandler);
		window.addEventListener("pointerup", pointerUpHandler);
		window.addEventListener("pointercancel", pointerUpHandler);
	}

	setDrawerContentCtx({ onDragStart });

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
			panelHeight = panel?.offsetHeight ?? 0;
			const focusable = panel?.querySelector<HTMLElement>(
				"button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
			);
			focusable?.focus();
		});

		return () => {
			unlockBody();
			if (main instanceof HTMLElement) main.inert = previousInert;
			translateY = 0;
			isDragging = false;
			releaseDragListeners();
			restoreFocusEl?.focus();
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

	onDestroy(() => {
		releaseDragListeners();
	});
</script>

<DrawerPortal>
	{#if ctx.open}
		<DrawerOverlay />
		<div
			bind:this={panel}
			role="dialog"
			aria-modal="true"
			aria-labelledby={ctx.labelled ? `${ctx.id}-title` : undefined}
			aria-label={ctx.labelled ? undefined : (ariaLabel ?? "Dialog")}
			class={cn(
				"fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-background-lighter/45 bg-background/96 text-foreground shadow-2xl supports-[backdrop-filter]:bg-background/92 supports-[backdrop-filter]:backdrop-blur-sm",
				extraClass,
			)}
			style={panelStyle}
			in:fly={{ y: 56, duration: 220 }}
			out:fly={{ y: 56, duration: 160 }}
		>
			{@render children?.()}
		</div>
	{/if}
</DrawerPortal>
