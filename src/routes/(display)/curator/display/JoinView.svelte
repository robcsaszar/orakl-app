<script lang="ts">
  import QRCode from "qrcode";
  import { MediaQuery } from "svelte/reactivity";
  import { fly } from "svelte/transition";
  import { getLobbyTitle } from "@/lib/lobby-titles.js";
  import { joinRoster, qrSvgCurrentColor } from "@/lib/display-join.js";
  import type { Player } from "@orakl/protocol";
  import Card from "$lib/components/ui/Card.svelte";
  import PlayerRow from "$lib/components/ui/PlayerRow.svelte";

  let {
    lobbyCode,
    players,
    avatarSrc,
  }: {
    lobbyCode: string | null;
    players: Player[];
    avatarSrc: (avatarId: string) => string;
  } = $props();

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  const joinUrl = $derived(
    lobbyCode && typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${encodeURIComponent(lobbyCode)}`
      : "",
  );
  let qrSvg = $state("");

  $effect(() => {
    if (!joinUrl) return;
    QRCode.toString(joinUrl, {
      type: "svg",
      margin: 1,
      color: { light: "#00000000" },
    })
      .then((svg) => {
        qrSvg = qrSvgCurrentColor(svg);
      })
      .catch(() => {});
  });

  // SSR / first paint uses the fixed 10-cap; a ResizeObserver then fits rows
  // to the ul's measured height so "+N more" never undercounts a clipped row.
  let listEl: HTMLUListElement | undefined = $state();
  let firstRowEl: HTMLLIElement | undefined = $state();
  let fitCap = $state(10);
  // Hides the list until the first real measure lands, so a projector never
  // sees the fixed 10-row guess snap down to the measured fit.
  let measured = $state(false);

  $effect(() => {
    const list = listEl;
    if (!list) return;
    const measure = () => {
      const rowHeight = firstRowEl?.clientHeight ?? 0;
      const availableHeight = list.clientHeight;
      if (!rowHeight) return;
      const gap = Number.parseFloat(getComputedStyle(list).rowGap) || 0;
      const pitch = rowHeight + gap;
      const fit = Math.floor((availableHeight + gap) / pitch);
      // Never 0: an empty list has no row to measure, so 0 would be sticky.
      fitCap = Math.max(1, fit);
      measured = true;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    if (firstRowEl) observer.observe(firstRowEl);
    return () => observer.disconnect();
  });

  const roster = $derived(joinRoster(players, fitCap));
</script>

<div class="grid w-full min-h-0 flex-1 gap-8 py-4 lg:grid-cols-[auto_1fr] lg:gap-16">
  <div class="flex flex-col items-center gap-6">
    {#if lobbyCode}
      <div class="flex flex-col items-center gap-1">
        <p class="text-lg text-foreground-darker">Lobby code</p>
        <p class="font-mono text-[clamp(4rem,12vh,10rem)] font-bold leading-none tracking-widest text-foreground">
          {lobbyCode}
        </p>
      </div>
      {#if qrSvg}
        <Card variant="rooftop" padding="md" class="shrink-0">
          <div
            class="h-[36vh] w-[36vh] [&>svg]:h-full [&>svg]:w-full"
            role="img"
            aria-label="QR code to join the lobby"
          >
            {@html qrSvg}
          </div>
        </Card>
      {/if}
    {/if}
  </div>

  <div class="flex min-h-0 flex-col gap-3">
    <p class="text-2xl tabular-nums text-foreground-darker" aria-live="polite">
      {roster.joined} joined
    </p>
    <ul
      bind:this={listEl}
      class="flex min-h-0 w-full max-w-xl flex-1 flex-col gap-2 overflow-hidden lg:max-w-2xl"
      class:invisible={!measured}
    >
      {#each roster.shown as player, i (player.id)}
        {@const title = getLobbyTitle(player.nickname)}
        <li
          {@attach (node: HTMLLIElement) => {
            if (i === 0) {
              firstRowEl = node;
              return () => {
                if (firstRowEl === node) firstRowEl = undefined;
              };
            }
          }}
          in:fly={{
            y: 8,
            duration: reducedMotion.current ? 0 : 200,
            delay: reducedMotion.current ? 0 : i * 30,
          }}
        >
          <PlayerRow
            size="lg"
            nickname={player.nickname}
            avatarSrc={avatarSrc(player.avatar) || undefined}
            prefix={title.prefix}
            suffix={title.suffix}
          />
        </li>
      {/each}
    </ul>
    <p class="text-xl text-foreground-darker" class:invisible={roster.overflow === 0}>
      +{roster.overflow} more
    </p>
  </div>
</div>
