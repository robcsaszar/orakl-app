<script lang="ts">
  import { tv } from "tailwind-variants";
  import { page } from "$app/state";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import Button from "@/lib/components/ui/Button.svelte";
  import Input from "@/lib/components/ui/Input.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import { toast } from "@/lib/toast";
  import { DraggableFab } from "@/lib/svelte/draggableFab.svelte.js";
  import { fabVariants } from "@/lib/fab-variants";

  type DevLoc = { file: string; line: number; column: number };

  const feedbackStyles = tv({
    slots: {
      highlight: "pointer-events-none fixed z-50 outline-2 outline-offset-4 outline-primary",
      banner:
        "pointer-events-none fixed inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-50 mx-auto w-fit animate-pop-in rounded-full corner-shape-squircle bg-background px-4 py-2 text-sm text-foreground shadow-xl",
      anchorCard:
        "flex items-start justify-between gap-2 rounded-xl corner-shape-squircle border border-secondary/30 bg-background-lighter/40 p-2.5",
      emptyCard:
        "flex items-center justify-between gap-2 rounded-xl corner-shape-squircle border border-dashed border-secondary/40 p-2.5",
      iconButton:
        "rounded-lg corner-shape-squircle p-1.5 text-foreground-darker transition-transform duration-150 ease-out active:scale-[0.97] hover:text-foreground disabled:opacity-30",
      pickButton:
        "flex shrink-0 items-center gap-1.5 rounded-lg corner-shape-squircle bg-secondary/20 px-2.5 py-1.5 text-xs font-medium text-secondary transition-transform duration-150 ease-out active:scale-[0.97] hover:bg-secondary/30",
      actionButton:
        "rounded-xl corner-shape-squircle px-4 py-2.5 text-sm transition-transform duration-150 ease-out active:scale-[0.97]",
    },
    variants: {
      action: {
        cancel: { actionButton: "text-foreground-darker hover:text-foreground" },
        save: { actionButton: "bg-secondary font-medium text-background disabled:opacity-50" },
      },
    },
  });

  let panelOpen = $state(false);
  let picking = $state(false);
  let targetEl = $state<HTMLElement | null>(null);
  let selectedEl = $state<HTMLElement | null>(null);
  let clickPoint = $state({ x: 0, y: 0 });
  let comment = $state("");
  let submitting = $state(false);
  let fieldError = $state<string | undefined>(undefined);
  let commentInputRef = $state<HTMLTextAreaElement | HTMLInputElement | null>(
    null,
  );
  let viewportWidth = $state(1024);
  let viewportHeight = $state(768);

  $effect(() => {
    if (selectedEl && !picking && commentInputRef) commentInputRef.focus();
  });

  function isInsideWidget(el: Element | null): boolean {
    return !!el?.closest("[data-feedback-widget]");
  }

  // The FAB opens the dialog straight into picking mode — the user taps an
  // element immediately, no separate "Pick element" click needed. Reselecting
  // ("pick a different element" from inside an already-open dialog) reuses
  // beginPicking() directly instead of going through here.
  function openPanel() {
    panelOpen = true;
    selectedEl = null;
    comment = "";
    fieldError = undefined;
    beginPicking();
  }

  // Enter picking mode — used both for the initial pick (via openPanel) and
  // for "pick a different element" from inside the dialog. selectedEl stays
  // set (so cancelling restores the previous pick) until a new tap lands.
  function beginPicking() {
    picking = true;
    fieldError = undefined;
  }

  function cancelPicking() {
    picking = false;
    targetEl = null;
  }

  function closePanel() {
    panelOpen = false;
    picking = false;
    targetEl = null;
    selectedEl = null;
    comment = "";
    fieldError = undefined;
  }

  function selectParent() {
    const parent = selectedEl?.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement)
      return;
    selectedEl = parent;
  }

  function onGlobalPointerMove(e: PointerEvent) {
    if (!picking) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    targetEl = el instanceof HTMLElement && !isInsideWidget(el) ? el : null;
  }

  function onGlobalClick(e: MouseEvent) {
    if (!picking) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!(el instanceof HTMLElement) || isInsideWidget(el)) return;
    e.preventDefault();
    e.stopPropagation();
    selectedEl = el;
    clickPoint = { x: e.clientX, y: e.clientY };
    picking = false;
    targetEl = null;
  }

  function onGlobalKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && picking) cancelPicking();
  }

  // ── Anchor capture ──────────────────────────────────────────────────────
  function structuralPath(el: HTMLElement): string {
    const parts: string[] = [];
    let node: HTMLElement | null = el;
    for (let depth = 0; node && node !== document.body && depth < 6; depth++) {
      const parent: HTMLElement | null = node.parentElement;
      let index = 1;
      if (parent) {
        for (let i = 0; i < parent.children.length; i++) {
          const sibling = parent.children[i];
          if (sibling === node) break;
          if (sibling.tagName === node.tagName) index++;
        }
      }
      parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${index})`);
      node = parent;
    }
    return (node !== document.body ? "… > " : "") + parts.join(" > ");
  }

  function landmark(el: HTMLElement): string | undefined {
    const parts: string[] = [];
    let node: HTMLElement | null = el;
    for (let depth = 0; node && node !== document.body && depth < 6; depth++) {
      const label = node.getAttribute("aria-label");
      if (label) {
        parts.unshift(label);
        break;
      }
      const heading = node.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > h4");
      if (heading?.textContent?.trim()) {
        parts.unshift(heading.textContent.trim());
        break;
      }
      node = node.parentElement;
    }
    return parts.length ? parts.join(" > ") : undefined;
  }

  function elementText(el: HTMLElement): string | undefined {
    const text = el.innerText?.trim().replace(/\s+/g, " ");
    return text ? text.slice(0, 80) : undefined;
  }

  function outerHtmlSnippet(el: HTMLElement): string | undefined {
    return el.outerHTML?.slice(0, 200);
  }

  function devLoc(el: HTMLElement): DevLoc | undefined {
    const meta = (el as unknown as { __svelte_meta?: { loc?: DevLoc } })
      .__svelte_meta;
    return meta?.loc;
  }

  // Owning components, leaf first, from the Svelte dev metadata on each
  // ancestor (present in dev builds and on review apps — see SVELTE_DEV_META
  // in svelte.config.ts). Undefined on a plain production build.
  const MAX_COMPONENTS = 8;
  function componentChain(el: HTMLElement): string[] | undefined {
    const files: string[] = [];
    for (let node: HTMLElement | null = el; node && files.length < MAX_COMPONENTS; node = node.parentElement) {
      const file = devLoc(node)?.file;
      if (file && !files.includes(file)) files.push(file);
    }
    return files.length ? files : undefined;
  }

  const componentName = (file: string) => file.slice(file.lastIndexOf("/") + 1);

  async function submit() {
    if (!selectedEl) return;
    const trimmed = comment.trim();
    if (!trimmed) {
      fieldError = "Say what's wrong before saving.";
      return;
    }
    fieldError = undefined;
    submitting = true;

    const rect = selectedEl.getBoundingClientRect();
    const xPercent = rect.width
      ? ((clickPoint.x - rect.left) / rect.width) * 100
      : 0;
    const yPercent = rect.height
      ? ((clickPoint.y - rect.top) / rect.height) * 100
      : 0;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: page.url.pathname,
          structuralPath: structuralPath(selectedEl),
          landmark: landmark(selectedEl),
          elementText: elementText(selectedEl),
          outerHtmlSnippet: outerHtmlSnippet(selectedEl),
          devLoc: devLoc(selectedEl),
          components: componentChain(selectedEl),
          xPercent,
          yPercent,
          viewport: { w: window.innerWidth, h: window.innerHeight },
          comment: trimmed,
        }),
      });
      const body = (await res.json()) as { issueUrl?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to save feedback");
      const issueUrl = body.issueUrl;
      toast.success("Feedback saved", {
        action: issueUrl
          ? { label: "View issue", onClick: () => window.open(issueUrl, "_blank") }
          : undefined,
      });
      closePanel();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save feedback");
    } finally {
      submitting = false;
    }
  }

  // While actively picking, follow the live hover/touch target; once
  // committed, lock onto the selection (which selectParent can still widen).
  const highlightEl = $derived(picking ? targetEl : selectedEl);
  const highlightRect = $derived.by(() => {
    if (typeof window === "undefined" || !highlightEl) return null;
    return highlightEl.getBoundingClientRect();
  });

  const canSelectParent = $derived.by(() => {
    const parent = selectedEl?.parentElement;
    return !!parent && parent !== document.body && parent !== document.documentElement;
  });

  const anchorPreview = $derived.by(() => {
    if (!selectedEl) return null;
    return {
      structuralPath: structuralPath(selectedEl),
      landmark: landmark(selectedEl),
      elementText: elementText(selectedEl),
      component: componentChain(selectedEl)?.[0],
    };
  });

  const styles = feedbackStyles();
  const fabClass = $derived(
    fabVariants({
      tone: picking ? "active" : "neutral",
      class:
        "fixed left-[calc(1rem_+_env(safe-area-inset-left))] bottom-[calc(1rem_+_env(safe-area-inset-bottom))]",
    }),
  );
  const cancelButtonClass = $derived(feedbackStyles({ action: "cancel" }).actionButton());
  const saveButtonClass = $derived(feedbackStyles({ action: "save" }).actionButton());

  // ── Draggable FAB ─────────────────────────────────────────────────────────
  // x/y stay null until the first drag — the CSS safe-area classes anchor
  // the corner and stay correct across any resize with zero JS until then.
  let fabEl = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const dragFab = new DraggableFab("feedback-fab-pos");

  $effect(() => {
    dragFab.restore();
  });

  // Once a dragged position exists, keep it on-screen across resizes.
  $effect(() => {
    if (!fabEl) return;
    dragFab.clampToViewport(fabEl, viewportWidth, viewportHeight);
  });

  function onFabPointerDown(e: PointerEvent) {
    dragFab.onPointerDown(e);
  }

  function onFabPointerMove(e: PointerEvent) {
    dragFab.onPointerMove(e);
  }

  function onFabPointerUp(e: PointerEvent) {
    if (dragFab.onPointerUp(e) !== "tap") return;
    // The FAB is only ever rendered when the dialog is closed or picking is
    // active (see the template), so there's no third "close" case here.
    if (picking) cancelPicking();
    else openPanel();
  }

  // The pointer never actually releases on an alt-tab/focus-stealing dialog,
  // so pointer capture can't end the gesture — force it closed here instead.
  function onWindowBlur() {
    dragFab.forceEnd(fabEl ?? undefined);
  }

  const fabStyle = $derived(dragFab.style(dragFab.isDragging ? "grabbing" : "grab"));
</script>

<svelte:window
  bind:innerWidth={viewportWidth}
  bind:innerHeight={viewportHeight}
  onpointermove={onGlobalPointerMove}
  onkeydown={onGlobalKeydown}
  onblur={onWindowBlur}
/>
<svelte:document onclickcapture={onGlobalClick} />

<div data-feedback-widget class="contents">
  {#if highlightRect}
    <div
      class={styles.highlight()}
      style="left:{highlightRect.left}px; top:{highlightRect.top}px; width:{highlightRect.width}px; height:{highlightRect.height}px;"
    ></div>
  {/if}

  {#if picking}
    <div class={styles.banner()}>
      Tap an element to comment
    </div>
  {/if}

  <ResponsiveOverlay
    id="feedback-widget"
    open={panelOpen && !picking}
    ariaLabel="Leave feedback"
    draggable
    panelClass="lg:w-80 lg:max-w-[calc(100vw_-_1.5rem)]"
    bodyClass="flex flex-col gap-3"
    footerClass="flex justify-end gap-2"
    onClose={closePanel}
  >
    {#if anchorPreview}
      <div class={styles.anchorCard()}>
        <div class="min-w-0 flex-1">
          <p class="truncate font-mono text-xs text-foreground-darker" title={anchorPreview.structuralPath}>
            {anchorPreview.structuralPath}
          </p>
          {#if anchorPreview.component}
            <p class="truncate font-mono text-xs text-secondary" title={anchorPreview.component}>{componentName(anchorPreview.component)}</p>
          {/if}
          {#if anchorPreview.landmark}
            <p class="truncate text-xs text-foreground-darker">{anchorPreview.landmark}</p>
          {/if}
          {#if anchorPreview.elementText}
            <p class="truncate text-xs italic text-foreground-darker">"{anchorPreview.elementText}"</p>
          {/if}
        </div>
        <div class="flex shrink-0 gap-1">
          <Button
            unstyled
            onclick={selectParent}
            disabled={!canSelectParent}
            aria-label="Select parent element"
            class={styles.iconButton()}
          >
            <Icon name="chevron-up" class="size-3.5" />
          </Button>
          <Button
            unstyled
            onclick={beginPicking}
            aria-label="Pick a different element"
            class={styles.iconButton()}
          >
            <Icon name="shuffle" class="size-3.5" />
          </Button>
        </div>
      </div>
    {:else}
      <div class={styles.emptyCard()}>
        <p class="text-xs text-foreground-darker">No element selected yet</p>
        <Button unstyled onclick={beginPicking} class={styles.pickButton()}>
          <Icon name="shuffle" class="size-3.5" />
          Pick element
        </Button>
      </div>
    {/if}
    <Input
      id="feedback-comment"
      name="comment"
      label="What's wrong here?"
      type="textarea"
      rows={3}
      bind:value={comment}
      bind:inputRef={commentInputRef}
      error={fieldError}
      placeholder="Describe the issue"
    />

    {#snippet footer()}
      <Button unstyled onclick={closePanel} class={cancelButtonClass}>
        Cancel
      </Button>
      <Button
        unstyled
        onclick={submit}
        disabled={submitting || !selectedEl}
        aria-label={selectedEl ? "Save feedback" : "Pick an element before saving"}
        class={saveButtonClass}
      >
        {submitting ? "Saving…" : "Save"}
      </Button>
    {/snippet}
  </ResponsiveOverlay>

  {#if !panelOpen || picking}
    <Button
      unstyled
      bind:ref={fabEl}
      type="button"
      onpointerdown={onFabPointerDown}
      onpointermove={onFabPointerMove}
      onpointerup={onFabPointerUp}
      onpointercancel={onFabPointerUp}
      aria-label={picking ? "Cancel feedback" : "Leave feedback"}
      aria-expanded={picking}
      class={fabClass}
      style={fabStyle}
    >
      <Icon name="pencil" class="size-4" />
      <Icon name="grip" class="size-3 opacity-50" />
    </Button>
  {/if}
</div>
