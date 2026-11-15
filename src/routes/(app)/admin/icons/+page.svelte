<script lang="ts">
  import { buttonVariants } from "@/lib/button-variants";
  import { MediaQuery } from "svelte/reactivity";
  import { beforeNavigate, invalidateAll } from "$app/navigation";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Checkbox from "$lib/components/ui/Checkbox.svelte";
  import FileInput from "$lib/components/ui/FileInput.svelte";
import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import {
    ICON_SCALE,
    type IconScale,
    type IconStep,
    type IconTier,
    ROLES,
    type RoleName,
    USAGE_SVGS,
  } from "$lib/icons";
  import { ICON_USAGES, type IconUsage, usageKey, usagesOf } from "$lib/icon-usages";
  import { NPCS } from "$lib/npcs";
  import { toast } from "$lib/toast";
  import PortraitDrawing from "./PortraitDrawing.svelte";
  import ScalePreview from "./ScalePreview.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const SEARCH_DEBOUNCE_MS = 250;
  const TIERS: IconTier[] = ["control", "emblem", "art"];
  const STEPS: IconStep[] = ["xs", "sm", "md", "lg", "xl"];
  type Tab = IconTier | "portrait";
  const TABS: Tab[] = ["control", "emblem", "art", "portrait"];
  const TAB_LABEL: Record<Tab, string> = {
    control: "Controls",
    emblem: "Emblems",
    art: "Art",
    portrait: "Portraits",
  };
  const PX_RANGE = { min: 8, max: 256 };
  const STROKE_RANGE = { min: 0.5, max: 4 };

  // The scale being edited; the preview cards render with it.
  // svelte-ignore state_referenced_locally
  let scale = $state<IconScale>(structuredClone(data.scale ?? ICON_SCALE));

  const scaleChanged = $derived(JSON.stringify(scale) !== JSON.stringify(ICON_SCALE));
  const scaleUnsaved = $derived(
    JSON.stringify(scale) !== JSON.stringify(data.scale ?? ICON_SCALE),
  );

  beforeNavigate(({ cancel }) => {
    if (!scaleUnsaved) return;
    cancel();
    toast.error("Save or reset the size scale first");
  });

  /** The number in an input, or null when it is empty, not numeric or outside the range. */
  function inRange(value: string, min: number, max: number, whole: boolean) {
    if (value.trim() === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return whole && !Number.isInteger(n) ? null : n;
  }

  function setPx(tier: IconTier, step: IconStep, value: string) {
    const n = inRange(value, PX_RANGE.min, PX_RANGE.max, true);
    if (n !== null) scale[tier][step].px = n;
  }

  function setStroke(step: IconStep, value: string) {
    const n = inRange(value, STROKE_RANGE.min, STROKE_RANGE.max, false);
    if (n !== null) scale.control[step].stroke = n;
  }

  async function saveScale() {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch("/api/admin/icons/scale", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify($state.snapshot(scale)),
      });
      if (!res.ok) {
        toast.error("Could not save the size scale.");
        return;
      }
      await invalidateAll();
    } finally {
      busy = false;
    }
  }

  async function resetScale() {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch("/api/admin/icons/scale", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not reset the size scale.");
        return;
      }
      scale = structuredClone(ICON_SCALE);
      await invalidateAll();
    } finally {
      busy = false;
    }
  }

  const controlRoles = (Object.entries(ROLES) as [RoleName, (typeof ROLES)[RoleName]][])
    .filter(([, role]) => role.tier === "control")
    .map(([name]) => name);

  const rolesOf = (tier: IconTier) =>
    (Object.entries(ROLES) as [RoleName, (typeof ROLES)[RoleName]][])
      .filter(([, role]) => role.tier === tier)
      .map(([name]) => name);
  const emblemRoles = rolesOf("emblem");
  const artRoles = rolesOf("art");
  const portraitKeys = NPCS.map((npc) => `npc-${npc.id}`);

  const artOf = (role: string): string | undefined =>
    (ROLES as Record<string, { art?: string }>)[role]?.art;

  /** Emblem of the pair a role belongs to, as emblem or as art. */
  const emblemOf = (name: string): string | undefined =>
    emblemRoles.find((e) => e === name || artOf(e) === name);

  let roleQuery = $state("");
  let changedOnly = $state(false);
  let outOfStepOnly = $state(false);

  /** Search, "Changed only" and "Out of step only" for one draft key. */
  const matches = (key: string) => {
    if (!key.includes(roleQuery.trim().toLowerCase())) return false;
    if (changedOnly && !hasDraft(key)) return false;
    if (outOfStepOnly) {
      const emblem = emblemOf(key);
      if (!emblem || !data.outOfStep.includes(emblem)) return false;
    }
    return true;
  };

  const KEYS: Record<Tab, string[]> = {
    control: controlRoles,
    emblem: emblemRoles,
    art: artRoles,
    portrait: portraitKeys,
  };
  const shown = $derived(
    Object.fromEntries(TABS.map((t) => [t, KEYS[t].filter(matches)])) as Record<Tab, string[]>,
  );
  let tab = $state<Tab>("control");

  const tabOf = (key: string): Tab =>
    key.startsWith("npc-") ? "portrait" : ROLES[key as RoleName].tier;

  /** True when the key belongs to an emblem/art pair that is out of step. */
  const outOfStep = (key: string) => data.outOfStep.includes(emblemOf(key) ?? "");

  /** Side panel on wide screens; a bottom sheet below. */
  const wide = new MediaQuery("min-width: 64rem", true);

  async function keep(emblem: string) {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch(`/api/admin/icons/pairs/${emblem}/confirm`, { method: "POST" });
      if (!res.ok) {
        toast.error("Could not keep the pair as is.");
        return;
      }
      await invalidateAll();
    } finally {
      busy = false;
    }
  }

  /** True when the key, or any usage's own drawing of it, is drafted. */
  const hasDraft = (key: string) =>
    Object.hasOwn(data.drafts, key) ||
    Object.keys(data.drafts).some((k) => k.startsWith(`${key}@`));

  /** The role or portrait open in the panel. */
  let selected = $state<string | null>(null);
  /** The usage getting its own drawing of the role; null edits the role everywhere. */
  let split = $state<IconUsage | null>(null);
  /** Draft key the picker, upload and Reset act on. */
  const target = $derived(selected && split ? usageKey(selected, split) : selected);
  /** Usage the panel previews draw with: the split, or the admin preview. */
  const previewUsage = $derived<IconUsage>(split ?? "admin.icon-preview");
  let query = $state("");
  let results = $state<{ name: string; svg: string }[]>([]);
  /** The Solar icon being previewed; saved only on "Apply". */
  let candidate = $state<{ name: string; svg: string } | null>(null);

  // Panel preview settings: the button and link styles the placements render with.
  let buttonVariant = $state<"primary" | "secondary" | "outline" | "ghost" | "featured">("secondary");
  let buttonIntent = $state<"compact" | "button" | "cta">("compact");
  let linkIntent = $state<"link" | "inline">("link");
  /** Placement button text; empty shows the role name. */
  let buttonLabel = $state("");
  /** Where the placement button draws its icon. */
  let iconPlace = $state<"before" | "after" | "only">("before");
  /** Solar icon under the pointer or keyboard focus; previews before a pick. */
  let hoverPick = $state<{ name: string; svg: string } | null>(null);
  /** Placements draw the current drawing or the candidate. */
  let previewWhich = $state<"now" | "new">("new");
  /** Size step this instance draws at; "auto" keeps each placement's own step. */
  let instStep = $state<IconStep | "auto">("auto");
  /** Stroke width for this instance as typed; empty keeps the scale's stroke. */
  let instStroke = $state("");
  /** The typed stroke when it is a valid width, else null. */
  const instStrokeValue = $derived.by(() => {
    const n = Number(instStroke);
    return String(instStroke ?? "").trim() !== "" && Number.isFinite(n) && n >= STROKE_RANGE.min && n <= STROKE_RANGE.max ? n : null;
  });

  /** Columns of the Solar results grid: the side panel, and the narrower sheet. */
  const RESULT_COLUMNS = { panel: 8, sheet: 6 };

  /** Arrow keys move through the Solar results grid; focus previews. */
  function gridKeys(e: KeyboardEvent, cols: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (!step) return;
    const buttons = [...(e.currentTarget as HTMLElement).querySelectorAll("button")];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[Math.max(0, Math.min(buttons.length - 1, i + step))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }
  /** True once a Solar search for the current query has answered. */
  let searched = $state(false);
  let busy = $state(false);

  /** Every Solar match for the current query, across all pages. */
  let total = $state(0);
  /** Solar pages fetched so far, by query: a repeat search or a new selection reuses them. */
  const solarCache = new Map<string, { icons: { name: string; svg: string }[]; total: number }>();
  const solarQuery = () => query.trim().toLowerCase().replace(/\s+/g, "-");

  /** One page of Solar matches for `q` from `offset`; null after an error toast. */
  async function fetchSolar(q: string, offset: number, signal?: AbortSignal) {
    const res = await fetch(
      `/api/admin/icons/solar?q=${encodeURIComponent(q)}&offset=${offset}`,
      { signal },
    );
    if (!res.ok) {
      toast.error("Could not search the icons.");
      return null;
    }
    return (await res.json()) as { icons: { name: string; svg: string }[]; total: number };
  }

  // Debounced Solar search for the open panel; a cached query answers at once,
  // and a newer keystroke aborts the request still in flight.
  $effect(() => {
    if (!selected || tabOf(selected) !== "control") return;
    const q = solarQuery();
    const cached = solarCache.get(q);
    if (cached) {
      results = cached.icons;
      total = cached.total;
      searched = true;
      return;
    }
    const controller = new AbortController();
    searched = false;
    const timer = setTimeout(async () => {
      try {
        const page = await fetchSolar(q, 0, controller.signal);
        if (!page) {
          results = [];
          return;
        }
        solarCache.set(q, page);
        results = page.icons;
        total = page.total;
        searched = true;
      } catch {
        if (controller.signal.aborted) return;
        toast.error("Could not search the icons.");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  });

  /** Appends the next page of matches for the current query. */
  async function moreSolar() {
    const q = solarQuery();
    const cached = solarCache.get(q);
    if (!cached || busy) return;
    busy = true;
    try {
      const page = await fetchSolar(q, cached.icons.length);
      if (!page) return;
      cached.icons = [...cached.icons, ...page.icons];
      if (solarQuery() === q) results = cached.icons;
    } catch {
      toast.error("Could not search the icons.");
    } finally {
      busy = false;
    }
  }

  function select(key: string) {
    query = "";
    results = [];
    searched = false;
    candidate = null;
    split = null;
    selected = key;
  }

  function toggleSplit(usage: IconUsage) {
    candidate = null;
    split = split === usage ? null : usage;
  }

  async function useCandidate() {
    if (!target || !candidate || busy) return;
    busy = true;
    try {
      const res = await fetch(`/api/admin/icons/drafts/${target}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "solar", name: candidate.name }),
      });
      if (!res.ok) {
        toast.error("Could not save the draft.");
        return;
      }
      candidate = null;
      await invalidateAll();
    } finally {
      busy = false;
    }
  }

  async function upload(files: FileList) {
    if (!target || busy) return;
    busy = true;
    try {
      const res = await fetch(`/api/admin/icons/drafts/${target}/upload`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ svg: await files[0].text() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Could not upload the SVG.");
        return;
      }
      if (body.warning) toast.warning(body.warning);
      await invalidateAll();
    } finally {
      busy = false;
    }
  }

  async function reset(role: string) {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch(`/api/admin/icons/drafts/${role}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not reset the icon.");
        return;
      }
      await invalidateAll();
    } finally {
      busy = false;
    }
  }
</script>

<Metatags title="Icons" description="Change the app's icons." />

<ScalePreview scale={() => scale}>
<div class="flex flex-col gap-6 py-8">
  <header class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="text-4xl font-semibold text-balance">Icons</h1>
      <p class="text-foreground-darker font-sans text-sm max-w-prose">
        Pick a role, compare, then use the new drawing. A draft shows only for you until you save it.
      </p>
    </div>
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div class="min-w-48 flex-1">
        <Input
          id="icon-role-search"
          name="icon-role-search"
          type="search"
          label="Search roles"
          placeholder="reveal, flame, zeus"
          bind:value={roleQuery}
        />
      </div>
      <Checkbox id="icon-changed-only" name="icon-changed-only" label="Changed only" bind:checked={changedOnly} />
      <Checkbox id="icon-out-of-step-only" name="icon-out-of-step-only" label="Out of step only" bind:checked={outOfStepOnly} />
    </div>
    <div class="flex flex-wrap gap-1 self-start rounded-2xl corner-shape-squircle border-2 border-secondary/10 p-1 font-sans text-sm" role="tablist" aria-label="Kind">
      {#each TABS as t (t)}
        <Button
          unstyled
          role="tab"
          aria-selected={tab === t}
          class="rounded-xl corner-shape-squircle px-3 py-1.5 {tab === t ? 'bg-secondary text-background font-semibold' : 'text-foreground-darker hover:text-foreground'}"
          onclick={() => (tab = t)}
        >
          {TAB_LABEL[t]} <span class="tabular-nums opacity-70">{shown[t].length}</span>
        </Button>
      {/each}
    </div>
  </header>

  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
    <div class="min-w-0" aria-label={TAB_LABEL[tab]} role="tabpanel">
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
        {#each shown[tab] as key (key)}
          <li>
            <Button
              unstyled
              aria-pressed={selected === key}
              class="relative flex w-full flex-col items-center gap-2 rounded-xl corner-shape-squircle border-2 px-2 py-3 transition-colors {selected === key ? 'border-secondary bg-secondary/10' : 'border-secondary/10 bg-secondary/5 hover:border-secondary/40'}"
              onclick={() => select(key)}
            >
              {#if tab === "portrait"}
                <PortraitDrawing id={key.slice("npc-".length)} class="size-8" />
              {:else}
                <Icon name={key as RoleName} usage="admin.icon-preview" size="lg" />
              {/if}
              <span class="w-full truncate text-center font-mono text-[0.7rem] text-foreground-darker">{key}</span>
              {#if hasDraft(key)}
                <span class="absolute top-2 right-2 size-1.5 rounded-full bg-primary" role="img" aria-label="Drafted"></span>
              {/if}
              {#if outOfStep(key)}
                <span class="absolute top-2 left-2 size-1.5 rounded-full bg-warning" role="img" aria-label="Out of step"></span>
              {/if}
            </Button>
          </li>
        {:else}
          <li class="text-foreground-darker col-span-full font-sans">No roles match</li>
        {/each}
      </ul>
    </div>

    {#if wide.current}
      <aside class="sticky top-20 flex h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-3xl corner-shape-squircle border-2 border-secondary/10 bg-secondary/5" aria-label="Selected icon">
        {#if selected}
          {@render panel(selected)}
        {:else}
          <p class="text-foreground-darker m-auto max-w-56 p-8 text-center font-sans text-sm text-balance">Pick a role to compare drawings, try it in place and apply a new one.</p>
        {/if}
      </aside>
    {/if}
  </div>

  <details class="rounded-2xl corner-shape-squircle border-2 border-secondary/10 px-4 py-3 font-sans text-sm">
    <summary class="cursor-pointer font-semibold">
      Size scale{#if scaleUnsaved}<span class="text-foreground-darker font-normal"> · unsaved</span>{:else if data.scale}<span class="text-foreground-darker font-normal"> · draft</span>{/if}
    </summary>
    <div class="flex flex-col gap-4 pt-4">
      <p class="text-foreground-darker max-w-prose">
        Pixel size per step, and stroke width for controls. Every icon on this page follows your edits.
      </p>
      <ul class="flex flex-col gap-3">
        {#each STEPS as step (step)}
          <li class="grid grid-cols-2 items-end gap-3 border-b border-secondary/10 pb-3 sm:grid-cols-[3rem_repeat(4,minmax(0,1fr))_5rem]">
            <span class="font-mono font-semibold max-sm:col-span-2">{step}</span>
            {#each TIERS as tier (tier)}
              <div class="flex flex-col gap-1">
                <Input
                  id="scale-{tier}-{step}-px"
                  name="scale-{tier}-{step}-px"
                  type="number"
                  size="sm"
                  label={tier === "control" ? `${step} px` : `${step} ${tier} px`}
                  min={PX_RANGE.min}
                  max={PX_RANGE.max}
                  step={1}
                  value={String(scale[tier][step].px)}
                  oninput={(e) => setPx(tier, step, e.currentTarget.value)}
                />
                {#if scale[tier][step].px !== ICON_SCALE[tier][step].px}
                  <span class="text-foreground-darker text-xs">Default {ICON_SCALE[tier][step].px}</span>
                {/if}
              </div>
              {#if tier === "control"}
                <div class="flex flex-col gap-1">
                  <Input
                    id="scale-control-{step}-stroke"
                    name="scale-control-{step}-stroke"
                    type="number"
                    size="sm"
                    label="{step} stroke"
                    min={STROKE_RANGE.min}
                    max={STROKE_RANGE.max}
                    step={0.25}
                    value={String(scale.control[step].stroke)}
                    oninput={(e) => setStroke(step, e.currentTarget.value)}
                  />
                  {#if scale.control[step].stroke !== ICON_SCALE.control[step].stroke}
                    <span class="text-foreground-darker text-xs">Default {ICON_SCALE.control[step].stroke}</span>
                  {/if}
                </div>
              {/if}
            {/each}
            <span class="flex items-center gap-2 self-center">
              <Icon name={controlRoles[0]} usage="admin.icon-preview" size={step} />
              <Icon name={emblemRoles[0] as RoleName} usage="admin.icon-preview" size={step} />
            </span>
          </li>
        {/each}
      </ul>
      <div class="flex gap-2">
        <Button variant="secondary" intent="compact" disabled={!scaleUnsaved || busy} onclick={saveScale}>Save draft</Button>
        {#if scaleChanged || data.scale}
          <ConfirmButton
            label="Reset"
            confirmLabel="Reset size scale?"
            variant="outline"
            onConfirm={resetScale}
          >
            {#snippet icon()}{/snippet}
            {#snippet confirmIcon()}{/snippet}
          </ConfirmButton>
        {/if}
      </div>
    </div>
  </details>
</div>

<ResponsiveOverlay
  id="icon-panel"
  open={!wide.current && selected !== null}
  hasTitle
  mode="drawer"
  onClose={() => (selected = null)}
>
  {#snippet title()}<span class="font-mono">{selected}</span>{/snippet}
  <div class="flex flex-col gap-5">
    {#if selected}{@render panel(selected, true)}{/if}
  </div>
</ResponsiveOverlay>
</ScalePreview>

{#snippet segment<T extends string>(label: string, options: readonly T[], value: T, set: (v: T) => void)}
  <div class="flex flex-col items-start gap-1 font-sans text-xs" role="group" aria-label={label}>
    <span class="text-foreground-darker">{label}</span>
    <div class="flex gap-0.5 rounded-xl corner-shape-squircle border-2 border-secondary/10 p-0.5">
      {#each options as option (option)}
        <Button
          unstyled
          aria-pressed={value === option}
          class="rounded-lg corner-shape-squircle px-2 py-1 {value === option ? 'bg-secondary text-background font-semibold' : 'text-foreground-darker hover:text-foreground'}"
          onclick={() => set(option)}
        >{option}</Button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet captioned(caption: string)}
  <span class="text-foreground-darker font-sans text-xs">{caption}</span>
{/snippet}


<!-- A placement's icon: the role, or the previewed pick drawn at the scale's px and stroke; this instance's size and stroke win when set. -->
{#snippet glyph(key: string, placementStep: IconStep)}
  {@const step = instStep === "auto" ? placementStep : instStep}
  {@const stroke = instStrokeValue ?? scale.control[step].stroke}
  {@const pick = previewWhich === "new" ? (hoverPick ?? candidate) : null}
  {#if pick}
    <span class="inline-flex shrink-0 [&_svg]:size-full [&_svg_*]:[stroke-width:var(--icon-stroke)]" style="width: {scale.control[step].px}px; height: {scale.control[step].px}px; --icon-stroke: {stroke};">{@html pick.svg}</span>
  {:else if instStrokeValue !== null}
    <span class="inline-flex shrink-0 [&_svg_*]:[stroke-width:var(--inst-stroke)]!" style="--inst-stroke: {instStrokeValue};"><Icon name={key as RoleName} usage={previewUsage} size={step} /></span>
  {:else}
    <Icon name={key as RoleName} usage={previewUsage} size={step} />
  {/if}
{/snippet}

<!-- The placement button, styled exactly as Button; its label is typed in place. -->
{#snippet placementButton(key: string)}
  {@const step = buttonIntent === "compact" ? "sm" : "md"}
  {#if iconPlace === "only"}
    <span class={buttonVariants({ variant: buttonVariant, intent: "icon" })} role="img" aria-label="{buttonLabel || key}, icon only">{@render glyph(key, "md")}</span>
  {:else}
    <span class={buttonVariants({ variant: buttonVariant, intent: buttonIntent })}>
      {#if iconPlace === "before"}{@render glyph(key, step)}{/if}
      <span
        class="min-w-4 cursor-text empty:before:content-[attr(data-placeholder)] focus:underline focus:decoration-dotted focus:underline-offset-3 focus:outline-none"
        contenteditable="plaintext-only"
        role="textbox"
        tabindex="0"
        aria-label="Button label"
        spellcheck="false"
        data-placeholder={key}
        bind:textContent={buttonLabel}
      ></span>
      {#if iconPlace === "after"}{@render glyph(key, step)}{/if}
    </span>
  {/if}
{/snippet}

{#snippet panel(key: string, inSheet = false)}
  {@const kind = tabOf(key)}
  {@const art = artOf(key)}
  {@const pair = emblemOf(key)}
  {@const usages = kind === "portrait" ? [] : usagesOf(key)}
  <div class="flex flex-col gap-2 bg-secondary/6 {inSheet ? 'rounded-2xl corner-shape-squircle p-4' : 'border-b-2 border-secondary/10 px-4 pt-4 pb-3'}">
    <div class="flex items-baseline justify-between gap-2">
      {#if !inSheet}<h2 class="font-mono text-xl font-semibold">{key}</h2>{/if}
      <span class="text-foreground-darker font-sans text-xs">
        {TAB_LABEL[kind]}{#if data.styles[key]} · {data.styles[key]}{/if}{#if target && data.drafts[target]} · draft{/if}
      </span>
    </div>
    {#if kind === "control"}
      <div class="flex items-center justify-between gap-2 font-sans text-xs text-foreground-darker">
        <span>{hoverPick ? `Previewing ${hoverPick.name}` : candidate ? `Picked ${candidate.name}` : "Hover a result to try it here"}</span>
        {@render segment("Show", ["now", "new"] as const, previewWhich, (v) => (previewWhich = v))}
      </div>
      <div class="flex flex-wrap items-center gap-3" title="Click the button text to edit it">
        {@render placementButton(key)}
        <p class="font-sans text-sm">
          Read more <Link href="#" intent={linkIntent} class="inline-flex items-center gap-1" onclick={(e) => e.preventDefault()}>guide{@render glyph(key, "sm")}</Link>
        </p>
      </div>
    {:else if kind === "emblem"}
      <div class="flex flex-wrap items-end gap-4">
        <span class="inline-flex flex-col items-center gap-1">
          <span
            class="bg-surface border-border inline-flex items-center justify-center overflow-hidden rounded-full border"
            style="width: {scale.emblem.lg.px + 24}px; height: {scale.emblem.lg.px + 24}px;"
          >
            <Icon name={key as RoleName} usage={previewUsage} size="lg" />
          </span>
          {@render captioned("Badge")}
        </span>
        <span class="inline-flex flex-col items-center gap-1">
          <span class="inline-flex items-center gap-2 font-sans text-sm"><Icon name={key as RoleName} usage={previewUsage} size="md" />{key}</span>
          {@render captioned("Header")}
        </span>
        {#if art}
          <span class="inline-flex flex-col items-center gap-1">
            <Icon name={art as RoleName} usage="admin.icon-preview" size="xl" />
            {@render captioned(`Pair: ${art}`)}
          </span>
        {/if}
      </div>
    {:else if kind === "art"}
      <span class="inline-flex flex-col items-start gap-1">
        <Icon name={key as RoleName} usage={previewUsage} size="xl" />
        {#if pair}{@render captioned(`Pair: ${pair}`)}{/if}
      </span>
    {:else}
      <span class="inline-flex flex-col items-start gap-1">
        <PortraitDrawing id={key.slice("npc-".length)} class="size-32" />
        {@render captioned("Opponent card")}
      </span>
    {/if}
  </div>

  <div
    class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain {inSheet ? 'pt-4' : 'px-4 py-3'}"
    {@attach (node: HTMLDivElement) => {
      // A new search starts at the top, not where the last list was scrolled to.
      solarQuery();
      node.scrollTop = 0;
    }}
  >
    {#if kind === "control"}
      <Input
        id="icon-solar-search"
        name="icon-solar-search"
        type="search"
        label="Search Solar icons"
        placeholder="home, bell, arrow"
        maxlength={40}
        bind:value={query}
      />
      {#if searched && results.length === 0}
        <p class="text-foreground-darker font-sans text-sm">No icons match</p>
      {:else if searched}
        {@render captioned(`${total} Solar icons${query.trim() ? " match" : ""}`)}
      {/if}
      <!-- Room for three rows, so the sections below stay put as matches come and go. -->
      <div class="flex min-h-38 shrink-0 flex-col gap-2">
      {#if results.length > 0}
        {@const cols = inSheet ? RESULT_COLUMNS.sheet : RESULT_COLUMNS.panel}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <ul
          class="grid gap-2"
          style="grid-template-columns: repeat({cols}, minmax(0, 1fr));"
          onkeydown={(e) => gridKeys(e, cols)}
          onmouseleave={() => (hoverPick = null)}
          onfocusout={() => (hoverPick = null)}
        >
          {#each results as icon (icon.name)}
            <li>
              <Button
                variant="outline"
                intent="icon"
                aria-label={icon.name}
                aria-pressed={candidate?.name === icon.name}
                data-tooltip={icon.name}
                class="w-full p-2 backdrop-blur-none [&_svg]:size-6 {candidate?.name === icon.name ? 'border-primary' : ''}"
                onmouseenter={() => (hoverPick = icon)}
                onfocus={() => (hoverPick = icon)}
                onclick={() => {
                  candidate = icon;
                  previewWhich = "new";
                }}
              >
                {@html icon.svg}
              </Button>
            </li>
          {/each}
        </ul>
        {#if results.length < total}
          <Button variant="outline" intent="compact" disabled={busy} onclick={moreSolar}>
            Show more ({total - results.length} left)
          </Button>
        {/if}
      {/if}
      </div>
    {/if}

    {#if kind === "control"}
      <details class="font-sans text-sm">
        <summary class="cursor-pointer font-semibold">Placement</summary>
        <div class="flex flex-col gap-2 pt-2">
          {@render segment("Style", ["primary", "secondary", "outline", "ghost", "featured"] as const, buttonVariant, (v) => (buttonVariant = v))}
          {@render segment("Size", ["compact", "button", "cta"] as const, buttonIntent, (v) => (buttonIntent = v))}
          {@render segment("Icon", ["before", "after", "only"] as const, iconPlace, (v) => (iconPlace = v))}
          {@render segment("Link", ["link", "inline"] as const, linkIntent, (v) => (linkIntent = v))}
        </div>
      </details>
      <details class="font-sans text-sm">
        <summary class="cursor-pointer font-semibold">This instance</summary>
        <div class="flex flex-col gap-2 pt-2">
        {@render captioned(split ? ICON_USAGES[split].where : "Preview only; split a usage to target one place")}
        {@render segment("Icon size", ["auto", ...STEPS] as const, instStep, (v) => (instStep = v))}
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <Input
              id="icon-instance-stroke"
              name="icon-instance-stroke"
              type="number"
              size="sm"
              label="Stroke"
              placeholder={String(scale.control[instStep === "auto" ? (buttonIntent === "compact" ? "sm" : "md") : instStep].stroke)}
              min={STROKE_RANGE.min}
              max={STROKE_RANGE.max}
              step={0.25}
              bind:value={instStroke}
            />
          </div>
          {#if instStep !== "auto" || instStroke}
            <Button
              variant="outline"
              intent="compact"
              onclick={() => {
                instStep = "auto";
                instStroke = "";
              }}
            >Use scale</Button>
          {/if}
        </div>
        </div>
      </details>
    {/if}

    {#if usages.length > 0}
      <details class="font-sans text-sm" open>
        <summary class="cursor-pointer font-semibold">Used in</summary>
      <div class="flex flex-wrap gap-1.5 pt-2" role="radiogroup" aria-label="Apply to">
        <Button
          unstyled
          role="radio"
          aria-checked={split === null}
          title="{usages.length} places share this drawing"
          class="rounded-xl corner-shape-squircle border-2 px-3 py-1.5 text-left {split === null ? 'border-secondary bg-secondary/10' : 'border-secondary/10 hover:border-secondary/40'}"
          onclick={() => {
            if (split) toggleSplit(split);
          }}
        >
          <span class="block font-semibold">Everywhere</span>
        </Button>
        {#each usages as usage (usage)}
          {@const own = Object.hasOwn(data.drafts, usageKey(key, usage)) || Object.hasOwn(USAGE_SVGS, usageKey(key, usage))}
          <Button
            unstyled
            role="radio"
            aria-checked={split === usage}
            title={usage}
            class="rounded-xl corner-shape-squircle border-2 px-3 py-1.5 text-left {split === usage ? 'border-secondary bg-secondary/10' : 'border-secondary/10 hover:border-secondary/40'}"
            onclick={() => {
              if (split !== usage) toggleSplit(usage);
            }}
          >
            <span class="block max-w-44 truncate">{ICON_USAGES[usage].where}{#if own} · own drawing{/if}</span>
          </Button>
        {/each}
      </div>
      </details>
    {/if}

    <FileInput id="icon-upload" label="Upload SVG" accept=".svg,image/svg+xml" disabled={busy} onfiles={upload} />
  </div>

  <div class="flex flex-col gap-2 border-t-2 border-secondary/10 {inSheet ? 'pt-4' : 'px-5 py-4'}">
    {#if pair && data.outOfStep.includes(pair)}
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="status" tone="warning">Out of step</Badge>
        <Button variant="outline" intent="compact" disabled={busy} onclick={() => keep(pair)}>Keep pair as is</Button>
      </div>
    {/if}
    <div class="flex items-center gap-2">
      {#if kind === "control"}
        <Button class="flex-1" disabled={!candidate || busy} onclick={useCandidate}>Apply {split ? "here" : "everywhere"}</Button>
      {:else}
        <span class="text-foreground-darker flex-1 font-sans text-xs">Upload an SVG to draft a new drawing.</span>
      {/if}
      {#if target && data.drafts[target]}
        <ConfirmButton
          label="Reset"
          confirmLabel="Reset {target}?"
          variant="outline"
          onConfirm={() => reset(target)}
        >
          {#snippet icon()}{/snippet}
          {#snippet confirmIcon()}{/snippet}
        </ConfirmButton>
      {/if}
    </div>
  </div>
{/snippet}
