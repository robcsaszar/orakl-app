<script lang="ts">
  import { beforeNavigate, invalidateAll } from "$app/navigation";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Checkbox from "$lib/components/ui/Checkbox.svelte";
  import FileInput from "$lib/components/ui/FileInput.svelte";
  import Card from "$lib/components/ui/Card.svelte";
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
  } from "$lib/icons";
  import { NPCS } from "$lib/npcs";
  import { toast } from "$lib/toast";
  import PortraitDrawing from "./PortraitDrawing.svelte";
  import ScalePreview from "./ScalePreview.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const SEARCH_DEBOUNCE_MS = 250;
  const TIERS: IconTier[] = ["control", "emblem", "art"];
  const STEPS: IconStep[] = ["xs", "sm", "md", "lg", "xl"];
  const TIER_LABEL: Record<IconTier, string> = {
    control: "Controls",
    emblem: "Emblems",
    art: "Art",
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
    if (changedOnly && !data.drafts[key]) return false;
    if (outOfStepOnly) {
      const emblem = emblemOf(key);
      if (!emblem || !data.outOfStep.includes(emblem)) return false;
    }
    return true;
  };

  const shownRoles = $derived(controlRoles.filter(matches));
  const shownEmblems = $derived(emblemRoles.filter(matches));
  const shownArt = $derived(artRoles.filter(matches));
  const shownPortraits = $derived(portraitKeys.filter(matches));

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

  let target = $state<string | null>(null);
  let query = $state("");
  let results = $state<{ name: string; svg: string }[]>([]);
  /** True once a Solar search for the current query has answered. */
  let searched = $state(false);
  let busy = $state(false);

  // Debounced Solar search for the open drawer; a newer keystroke aborts the
  // request still in flight.
  $effect(() => {
    if (!target || ROLES[target as RoleName]?.tier !== "control") return;
    const q = query.trim().toLowerCase().replace(/\s+/g, "-");
    const controller = new AbortController();
    searched = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/icons/solar?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          results = [];
          toast.error("Could not search the icons.");
          return;
        }
        results = (await res.json()).icons;
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

  function change(role: string) {
    query = "";
    results = [];
    searched = false;
    target = role;
  }

  async function choose(name: string) {
    if (!target || busy) return;
    busy = true;
    try {
      const res = await fetch(`/api/admin/icons/drafts/${target}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "solar", name }),
      });
      if (!res.ok) {
        toast.error("Could not save the draft.");
        return;
      }
      target = null;
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
      target = null;
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

<div class="flex flex-col gap-8 py-8">
  <header class="flex flex-col gap-2">
    <h1 class="text-lg font-semibold">Icons</h1>
    <p class="text-foreground-darker font-sans max-w-prose">
      Pick an icon for a role. A draft shows for you on every page until you discard it.
    </p>
    <Input
      id="icon-role-search"
      name="icon-role-search"
      type="search"
      label="Search roles"
      placeholder="reveal, flame, zeus"
      bind:value={roleQuery}
    />
    <div class="flex flex-wrap gap-4">
      <Checkbox id="icon-changed-only" name="icon-changed-only" label="Changed only" bind:checked={changedOnly} />
      <Checkbox id="icon-out-of-step-only" name="icon-out-of-step-only" label="Out of step only" bind:checked={outOfStepOnly} />
    </div>
  </header>

  <section aria-labelledby="icons-scale" class="flex flex-col gap-3">
    <h2 id="icons-scale" class="font-semibold">Size scale</h2>
    <p class="text-foreground-darker font-sans max-w-prose">
      Pixel size per step, and stroke width for controls. The preview cards below follow your edits.
    </p>
    {#each TIERS as tier (tier)}
      <Card variant="default" class="gap-3">
        <h3 class="text-sm font-semibold">{TIER_LABEL[tier]}</h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {#each STEPS as step (step)}
            <div class="flex flex-col gap-2">
              <Input
                id="scale-{tier}-{step}-px"
                name="scale-{tier}-{step}-px"
                type="number"
                size="sm"
                label="{step} px"
                min={PX_RANGE.min}
                max={PX_RANGE.max}
                step={1}
                value={String(scale[tier][step].px)}
                oninput={(e) => setPx(tier, step, e.currentTarget.value)}
              />
              {#if scale[tier][step].px !== ICON_SCALE[tier][step].px}
                <span class="text-foreground-darker text-xs">Default {ICON_SCALE[tier][step].px}</span>
              {/if}
              {#if tier === "control"}
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
              {/if}
            </div>
          {/each}
        </div>
      </Card>
    {/each}
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
  </section>

  <ScalePreview scale={() => scale}>
    <section aria-labelledby="icons-controls">
      <h2 id="icons-controls" class="mb-3 font-semibold">{TIER_LABEL.control}</h2>
      <ul class="flex flex-col gap-3">
        {#each shownRoles as role (role)}
          <li>
            <Card variant="default" class="gap-3">
              {@render rowHead(role)}
              <div class="flex flex-wrap items-end gap-4">
                {@render captioned("Button")}
                <Button variant="secondary" iconBefore={role}>{role}</Button>
                {@render captioned("Icon button")}
                <Button variant="secondary" intent="icon" aria-label={role} iconBefore={role} />
                {@render captioned("Inline link")}
                <p class="font-sans">
                  Read more <Link href="#" intent="link" class="inline-flex items-center gap-1 underline underline-offset-3" onclick={(e) => e.preventDefault()}>about {role}<Icon name={role} size="sm" /></Link>
                </p>
              </div>
            </Card>
          </li>
        {:else}
          <li class="text-foreground-darker font-sans">No roles match</li>
        {/each}
      </ul>
    </section>

    <section aria-labelledby="icons-emblems">
      <h2 id="icons-emblems" class="mb-3 font-semibold">{TIER_LABEL.emblem}</h2>
      <ul class="flex flex-col gap-3">
        {#each shownEmblems as role (role)}
          {@const art = artOf(role)}
          <li>
            <Card variant="default" class="gap-3">
              {@render rowHead(role)}
              <div class="flex flex-wrap items-end gap-4">
                <span class="inline-flex flex-col items-center gap-1">
                  <span
                    class="bg-surface border-border inline-flex items-center justify-center overflow-hidden rounded-full border"
                    style="width: {scale.emblem.lg.px + 24}px; height: {scale.emblem.lg.px + 24}px;"
                  >
                    <Icon name={role} size="lg" />
                  </span>
                  <span class="text-foreground-darker font-sans text-xs">Badge</span>
                </span>
                <span class="inline-flex flex-col items-center gap-1">
                  <span class="inline-flex items-center gap-2 font-sans text-sm">
                    <Icon name={role} size="md" />{role}
                  </span>
                  <span class="text-foreground-darker font-sans text-xs">Header</span>
                </span>
                {#if art}
                  <span class="inline-flex flex-col items-center gap-1">
                    <Icon name={art as RoleName} size="xl" />
                    <span class="text-foreground-darker font-sans text-xs">Pair: {art}</span>
                  </span>
                  {#if data.outOfStep.includes(role)}
                    <Badge variant="status" tone="warning">Out of step</Badge>
                    <Button variant="outline" intent="compact" disabled={busy} onclick={() => keep(role)}>Keep as is</Button>
                  {/if}
                {/if}
              </div>
            </Card>
          </li>
        {:else}
          <li class="text-foreground-darker font-sans">No roles match</li>
        {/each}
      </ul>
    </section>

    <section aria-labelledby="icons-art">
      <h2 id="icons-art" class="mb-3 font-semibold">{TIER_LABEL.art}</h2>
      <ul class="flex flex-col gap-3">
        {#each shownArt as role (role)}
          <li>
            <Card variant="default" class="gap-3">
              {@render rowHead(role)}
              <span class="inline-flex flex-col items-start gap-1">
                <Icon name={role} size="xl" />
                <span class="text-foreground-darker font-sans text-xs">Art</span>
              </span>
              {#if emblemOf(role) && data.outOfStep.includes(emblemOf(role) ?? "")}
                <div class="flex items-center gap-2">
                  <Badge variant="status" tone="warning">Out of step</Badge>
                  <span class="text-foreground-darker font-sans text-xs">Pair: {emblemOf(role)}</span>
                  <Button variant="outline" intent="compact" disabled={busy} onclick={() => keep(emblemOf(role) ?? "")}>Keep as is</Button>
                </div>
              {/if}
            </Card>
          </li>
        {:else}
          <li class="text-foreground-darker font-sans">No roles match</li>
        {/each}
      </ul>
      <h3 id="icons-portraits" class="mt-6 mb-3 font-semibold">Portraits</h3>
      <ul class="flex flex-col gap-3" aria-labelledby="icons-portraits">
        {#each shownPortraits as key (key)}
          <li>
            <Card variant="default" class="gap-3">
              {@render rowHead(key)}
              <span class="inline-flex flex-col items-start gap-1">
                <PortraitDrawing id={key.slice("npc-".length)} />
                <span class="text-foreground-darker font-sans text-xs">Opponent card</span>
              </span>
            </Card>
          </li>
        {:else}
          <li class="text-foreground-darker font-sans">No roles match</li>
        {/each}
      </ul>
    </section>
  </ScalePreview>
</div>

{#snippet captioned(caption: string)}
  <span class="text-foreground-darker font-sans text-xs uppercase">{caption}</span>
{/snippet}

{#snippet rowHead(key: string)}
  <div class="flex flex-wrap items-center justify-between gap-3">
    <span class="font-mono text-sm">
      {key}{#if data.styles[key]}<span class="text-foreground-darker font-sans"> · {data.styles[key]}</span>{/if}
    </span>
    <div class="flex items-center gap-2">
      <Button variant="outline" intent="compact" disabled={busy} onclick={() => change(key)}>Change</Button>
      {#if data.drafts[key]}
        <ConfirmButton
          label="Reset"
          confirmLabel="Reset {key}?"
          variant="outline"
          onConfirm={() => reset(key)}
        >
          {#snippet icon()}{/snippet}
          {#snippet confirmIcon()}{/snippet}
        </ConfirmButton>
      {/if}
    </div>
  </div>
{/snippet}

<ResponsiveOverlay
  id="icon-picker"
  open={target !== null}
  hasTitle
  mode="drawer"
  onClose={() => (target = null)}
>
  {#snippet title()}Change {target}{/snippet}
  <div class="flex flex-col gap-4">
    {#if target && ROLES[target as RoleName]?.tier === "control"}
      <Input
        id="icon-solar-search"
        name="icon-solar-search"
        type="search"
        label="Search Solar icons"
        placeholder="home, bell, arrow"
        maxlength={40}
        bind:value={query}
      />
    {/if}
    <FileInput id="icon-upload" label="Upload SVG" accept=".svg,image/svg+xml" disabled={busy} onfiles={upload} />
    {#if searched && results.length === 0}
      <p class="text-foreground-darker font-sans">No icons match</p>
    {/if}
    <ul class="grid grid-cols-5 gap-2 sm:grid-cols-6">
      {#each results as icon (icon.name)}
        <li>
          <Button
            variant="outline"
            intent="icon"
            aria-label={icon.name}
            data-tooltip={icon.name}
            disabled={busy}
            class="w-full [&_svg]:size-6"
            onclick={() => choose(icon.name)}
          >
            {@html icon.svg}
          </Button>
        </li>
      {/each}
    </ul>
  </div>
</ResponsiveOverlay>
