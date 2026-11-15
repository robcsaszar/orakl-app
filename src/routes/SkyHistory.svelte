<!--
  The history of the whole sky, one for every part: a tab with every change
  from every part in the order they were made, and a tab for each part's own.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import Badge from "@/lib/components/ui/Badge.svelte";
  import Button from "@/lib/components/ui/Button.svelte";
  import ConfirmButton from "@/lib/components/ui/ConfirmButton.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import Tabs from "@/lib/components/ui/Tabs.svelte";
  import type { Change } from "@/lib/sky-history.svelte";
  import { ago, SKY_PART_ORDER, type SkyTimeline, skyParts, skyView, ui } from "./sky-panel.svelte";

  /** One change, with the part and the line of changes it belongs to. */
  interface Entry {
    id: string;
    part: string;
    /** The part's name: "Clouds". */
    label: string;
    /** "Stars", or "Clouds · Cloud 3" where a part has more than one line. */
    of: string;
    change: Change;
    index: number;
    timeline: SkyTimeline;
  }

  const ALL = "all";
  /** The colour of each part's badge. */
  const TONES: Record<string, "info" | "primary" | "success" | "warning"> = { colours: "warning", stars: "primary", clouds: "info", birds: "success" };
  /** Letters of a change and its cloud past which the line may be cut short. */
  const LONG = 34;
  let which = $state(ALL);

  const parts = $derived(SKY_PART_ORDER.flatMap((key) => (skyParts[key] ? [{ key, part: skyParts[key] }] : [])));
  const tabs = $derived([{ key: ALL, label: "Everything" }, ...parts.map(({ key, part }) => ({ key, label: part.label }))]);
  /** Every change of the parts on a tab, newest first. */
  const entriesOf = (tab: string): Entry[] =>
    parts
      .filter(({ key }) => tab === ALL || key === tab)
      .flatMap(({ key, part }) =>
        part.timelines().flatMap((timeline, line) =>
          timeline.changes.map((change, index) => ({
            id: `${key}/${line}/${timeline.name}/${index}`,
            part: key,
            label: part.label,
            of: timeline.name === part.label ? part.label : `${part.label} · ${timeline.name}`,
            change,
            index,
            timeline,
          })),
        ),
      )
      .sort((a, b) => b.change.at - a.change.at);
  const linesOf = (tab: string) => parts.filter(({ key }) => tab === ALL || key === tab).flatMap(({ part }) => part.timelines());

  /**
   * Goes back to a moment. On the tab of everything, every part goes to how
   * it stood then; on a part's own tab, only the line the change is in moves.
   */
  function goTo(tab: string, entry: Entry | null) {
    if (tab !== ALL && entry) {
      entry.timeline.goTo(entry.index);
      return;
    }
    for (const timeline of linesOf(tab)) {
      const upTo = entry ? timeline.changes.filter((c) => c.at <= entry.change.at).length - 1 : -1;
      if (upTo !== timeline.at) timeline.goTo(upTo);
    }
  }

  // Read again every second, so "just now" grows old.
  let tick = $state(0);
  onMount(() => {
    const timer = setInterval(() => tick++, 1000);
    return () => clearInterval(timer);
  });
  const when = (at: number) => {
    void tick;
    return ago(at);
  };
  const line =
    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-secondary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary";
</script>

<Tabs {tabs} selected={which} onSelect={(k) => (which = k)} label="Whose history" class="min-h-0 flex-1 gap-0 px-6 pt-3 max-sm:px-4 max-sm:pt-2" panelClass="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pt-6 pb-8 pl-4 -ml-4 pr-3 -mr-3 max-sm:pt-4 max-sm:pb-5">
  {#snippet panel(tab)}
    {@const entries = entriesOf(tab)}
    <!-- The newest change that is in the sky now; later ones were gone back past. -->
    {@const now = entries.find((e) => e.index <= e.timeline.at)}
    {@const what = tab === ALL ? "the whole sky" : (skyParts[tab as (typeof SKY_PART_ORDER)[number]]?.label.toLowerCase() ?? "")}
    <div class="flex items-center justify-between gap-2">
      <h3 class={ui.heading}>History of {what}</h3>
      <div class="flex items-center gap-1">
        {#if entries.length}
          <ConfirmButton label="Forget" confirmLabel="Forget this history?" confirmVariant="neutral" variant="outline" revealDelay={0} duration={4000} onConfirm={() => linesOf(tab).forEach((t) => { t.forget(); })} class={ui.confirm}>
            {#snippet icon()}<Icon name="delete" usage="sky.history-forget" size="xs" />{/snippet}
            {#snippet confirmIcon()}<Icon name="confirm" usage="sky.history-forget-confirm" size="xs" />{/snippet}
          </ConfirmButton>
        {/if}
        <Button variant="outline" intent="compact" radius="rounded" class={ui.compact} onclick={() => (skyView.view = "settings")}>Back to settings</Button>
      </div>
    </div>
    <p class={ui.hint}>
      {#if tab === ALL}
        Every change to the sky, the stars, the clouds and the birds, newest first. Click a line and every part goes back to that moment.
      {:else}
        Newest first. Click a line and only that change's own part goes back to it; the rest of the sky stays.
      {/if}
      The list is kept when you close the page. Forget clears the list and leaves the sky as it is.
    </p>
    <ol class="flex flex-col" reversed>
      {#each entries as e (e.id)}
        {@const gone = e.index > e.timeline.at}
        <li>
          <!-- A line cut short says all of itself in the tip. -->
          <Button unstyled data-tooltip={e.change.label.length + e.timeline.name.length > LONG ? `${e.change.label} · ${e.of}` : undefined} aria-current={e === now ? "step" : undefined} class="{line} {e === now ? 'bg-secondary/15 text-foreground' : gone ? 'text-foreground-darker/50' : 'text-foreground-darker'}" onclick={() => goTo(tab, e)}>
            <span class="min-w-0 flex-1 truncate">{e.change.label}</span>
            {#if tab === ALL}
              <Badge variant="status" tone={TONES[e.part] ?? "neutral"} class="shrink-0">{e.label}</Badge>
            {/if}
            {#if e.timeline.name !== e.label}
              <Badge variant="status" class="max-w-40 shrink truncate">{e.timeline.name}</Badge>
            {/if}
            <span class="w-20 shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums">{e === now ? "now" : when(e.change.at)}</span>
          </Button>
        </li>
      {/each}
      <li>
        <Button unstyled aria-current={now ? undefined : "step"} class="{line} {now ? 'text-foreground-darker' : 'bg-secondary/15 text-foreground'}" onclick={() => goTo(tab, null)}>
          <span class="min-w-0 flex-1">{entries.length ? "Before any change" : "No changes yet"}</span>
          {#if !now && entries.length}<span class="shrink-0 font-mono text-xs">now</span>{/if}
        </Button>
      </li>
    </ol>
  {/snippet}
</Tabs>
