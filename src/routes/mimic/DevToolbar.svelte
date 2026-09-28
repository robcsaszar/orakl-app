<script lang="ts">
import { BADGES, BADGE_ORDER } from "@orakl/shared";
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolveBotDistribution } from "@/lib/mock/distribution.js";
  import { CAST_MAX, type CastRow, defaultCast, parseCast, randomCastRow, serializeCast } from "@/lib/mock/cast.js";
  
  import { GAME } from "data/game.settings.js";
  import { DraggableFab } from "@/lib/svelte/draggableFab.svelte.js";
  import { fabVariants } from "@/lib/fab-variants";
  import Button from "@/lib/components/ui/Button.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import Checkbox from "@/lib/components/ui/Checkbox.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import Input from "@/lib/components/ui/Input.svelte";
  import ResponsiveOverlay from "@/lib/components/ui/ResponsiveOverlay.svelte";
  import SegmentedPicker from "@/lib/components/ui/SegmentedPicker.svelte";
  import Slider from "@/lib/components/ui/Slider.svelte";

  type Opt = { key: string; label: string };
  const opts = (keys: readonly string[], label = (k: string) => k): Opt[] =>
    keys.map((key) => ({ key, label: label(key) }));

  const QTYPES = ["text_choice", "true_false", "image_matching"] as const;
  const STATES = ["unanswered", "selected", "correct", "incorrect", "timeout"] as const;
  const DIFFICULTIES = ["easy", "medium", "hard"] as const;
  const ROLES = ["player", "observer"] as const;
  const SOLO_MODES = ["normal", "endless"] as const;
  const DISPLAY_VIEWS = ["waiting", "question", "final"] as const;

  let open = $state(false);
  // Mirrors the old `lg:` split: sheet below, non-modal panel beside the FAB above.
  let isDesktop = $state(false);
  $effect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      isDesktop = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  });

  const qtype = $derived(page.url.searchParams.get("qtype") ?? "text_choice");
  const answerState = $derived(page.url.searchParams.get("state") ?? "unanswered");
  const difficulty = $derived(page.url.searchParams.get("difficulty") ?? "medium");
  const role = $derived(page.url.searchParams.get("role") ?? "player");
  // Curator toolbox preview (ADR 0019 route unification) — layers on top of
  // the ordinary player/observer perspective within the quiz mode, same as the
  // real curator toolbox does; no separate mode/route anymore.
  const curatorMode = $derived(page.url.searchParams.get("curator") === "1");
  const timer = $derived(parseInt(page.url.searchParams.get("timer") ?? "20", 10));
  const players = $derived(parseInt(page.url.searchParams.get("players") ?? "4", 10));
  const castRows = $derived(parseCast(page.url.searchParams.get("cast")) ?? defaultCast(players));
  const intermission = $derived(page.url.searchParams.get("intermission") === "1");
  const isRoles = $derived(page.url.pathname === "/mimic/quiz/roles");
  const isJoin = $derived(page.url.pathname === "/mimic/join");
  const JOIN_STATES = ["blocked", "device", "full", "failed"] as const;
  const rsubmitted = $derived(page.url.searchParams.get("rsubmitted") === "1");
  const rlocked = $derived(page.url.searchParams.get("rlocked") === "1");
  const anon = $derived(page.url.searchParams.get("anon") === "1");
  const claimed = $derived(page.url.searchParams.get("claimed") === "1");
  const qtotal = $derived(Math.max(1, parseInt(page.url.searchParams.get("qtotal") ?? "5", 10)));
  const qindex = $derived(Math.min(
    Math.max(0, parseInt(page.url.searchParams.get("qindex") ?? "0", 10)),
    qtotal - 1,
  ));
  const score = $derived(Math.max(0, parseInt(page.url.searchParams.get("score") ?? "0", 10)));
  // Identity-pill prototype (see IdentityPill.svelte `variant`): layout 1/2/3
  // plus the round's earned points, so the delta cue can be checked against the
  // variable amounts time-based scoring hands out.
  const pill = $derived(Math.min(3, Math.max(1, parseInt(page.url.searchParams.get("pill") ?? "1", 10))));
  const earned = $derived(Math.max(0, parseInt(page.url.searchParams.get("earned") ?? "100", 10)));
  const PILL_VARIANTS = [
    ["1", "inline"],
    ["2", "equation"],
    ["3", "segments"],
  ] as const;
  const soloMode = $derived(page.url.searchParams.get("mode") ?? "normal");
  const strikes = $derived(Math.min(3, Math.max(0, parseInt(page.url.searchParams.get("strikes") ?? "0", 10))));
  const streak = $derived(Math.max(0, parseInt(page.url.searchParams.get("streak") ?? "0", 10)));
  // Streak flourish preview (see mimic/solo layout's `session.streakFlourish`)
  // — at most one of these four params is set at a time.
  const FLOURISH_PARAMS = ["streaklost", "streaknearmiss", "streakbest", "streaklife"] as const;
  const streakLostParam = $derived(page.url.searchParams.get("streaklost"));
  const streakNearMissParam = $derived(page.url.searchParams.get("streaknearmiss"));
  const streakBestParam = $derived(page.url.searchParams.get("streakbest"));
  const streakLifeParam = $derived(page.url.searchParams.get("streaklife"));
  const anyFlourishActive = $derived(
    streakLostParam !== null || streakNearMissParam !== null || streakBestParam !== null || streakLifeParam !== null
  );
  const isGuestParam = $derived(page.url.searchParams.get("guest") === "1");
  const emotesParam = $derived(page.url.searchParams.get("emotes") === "1");
  const nickname = $derived(page.url.searchParams.get("nickname") ?? "Dev Player");
  const category = $derived(page.url.searchParams.get("category") ?? "");
  const qtext = $derived(page.url.searchParams.get("qtext") ?? "");
  const aTexts = $derived([
    page.url.searchParams.get("a1") ?? "",
    page.url.searchParams.get("a2") ?? "",
    page.url.searchParams.get("a3") ?? "",
    page.url.searchParams.get("a4") ?? "",
  ]);
  const img = $derived(page.url.searchParams.get("img") ?? "");
  const dview = $derived(page.url.searchParams.get("dview") ?? "waiting");

  const answerCount = $derived(
    qtype === "true_false" ? 2 : qtype === "image_matching" ? 3 : 4
  );

  // ── Bot answer distribution (quiz overlay preview) ──
  const showingResult = $derived(
    answerState === "correct" || answerState === "incorrect" || answerState === "timeout"
  );
  const botCount = $derived(Math.max(0, castRows.length - 1));
  const distCounts = $derived(
    resolveBotDistribution(page.url.searchParams.get("dist"), answerCount, botCount)
  );
  const distRemaining = $derived(botCount - distCounts.reduce((a, b) => a + b, 0));

  function setDistSlot(slot: number, value: number) {
    const next = [...distCounts];
    next[slot] = Math.max(0, Math.min(botCount, value));
    setParam("dist", next.join(","));
  }

  function setDistPreset(preset: "even" | "landslide" | "allWrong" | "reset") {
    if (preset === "reset") {
      const url = new URL(page.url.href);
      url.searchParams.delete("dist");
      goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
      return;
    }
    const next = new Array(answerCount).fill(0);
    if (preset === "even") {
      for (let i = 0; i < botCount; i++) next[i % answerCount]++;
      setParam("dist", next.join(","));
    } else if (preset === "landslide") {
      next[0] = botCount;
      setParam("dist", next.join(","));
    } else {
      // allWrong: pile every bot onto a wrong slot and force the player wrong too,
      // so the correct answer gets zero picks — previews the "everyone missed" badge.
      next[1] = botCount;
      setParams([["dist", next.join(",")], ["state", "incorrect"]]);
    }
  }

  function setParam(key: string, value: string) {
    setParams([[key, value]]);
  }

  function setParams(entries: [string, string][]) {
    const url = new URL(page.url.href);
    for (const [key, value] of entries) url.searchParams.set(key, value);
    goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
  }

  function toggleParam(key: string, current: boolean) {
    setParam(key, current ? "0" : "1");
  }

  // ── Players (cast) — nickname + role per row, added/removed one at a time ──
  function setCast(rows: CastRow[]) {
    setParam("cast", serializeCast(rows));
  }

  function addCastRow() {
    if (castRows.length >= CAST_MAX) return;
    setCast([...castRows, randomCastRow(castRows)]);
  }

  function removeCastRow(index: number) {
    setCast(castRows.filter((_, i) => i !== index));
  }

  function setCastNickname(index: number, nickname: string) {
    setCast(castRows.map((r, i) => (i === index ? { ...r, nickname } : r)));
  }

  function setCastRole(index: number, role: CastRow["role"]) {
    setCast(castRows.map((r, i) => (i === index ? { ...r, role } : r)));
  }

  // Turning emotes on while unanswered would leave canEmote's gate closed
  // (it needs `answered` or a revealed `correctAnswerId`, neither true yet) —
  // so also jump to "selected" in that case, matching the checkbox's own
  // label ("...pre-reveal — state: selected"). A reveal state (correct/
  // incorrect/timeout) already satisfies the gate on its own, so leave it
  // alone rather than clobbering a reveal preview the user set up on purpose.
  function toggleEmotes() {
    if (emotesParam) {
      setParam("emotes", "0");
      return;
    }
    if (answerState === "unanswered") {
      setParams([["emotes", "1"], ["state", "selected"]]);
    } else {
      setParam("emotes", "1");
    }
  }

  const isQuiz = $derived(page.url.pathname.startsWith("/mimic/quiz"));
  const isSolo = $derived(page.url.pathname.startsWith("/mimic/solo"));
  const isDisplay = $derived(page.url.pathname.startsWith("/mimic/display"));
  const isErrors = $derived(page.url.pathname.startsWith("/mimic/error"));
  const isQuizResults = $derived(page.url.pathname === "/mimic/quiz/results");
  const isSoloResults = $derived(page.url.pathname === "/mimic/solo/results");

  // ── Solo results eligibility (leaderboard / streak-only / guest) ──
  type ResultEligibility = "leaderboard" | "streak" | "guest";
  const resultEligibility = $derived<ResultEligibility>(
    isGuestParam ? "guest" : soloMode === "endless" ? "streak" : "leaderboard"
  );

  function setResultEligibility(kind: ResultEligibility) {
    if (kind === "guest") {
      setParam("guest", "1");
      return;
    }
    const entries: [string, string][] = [
      ["guest", "0"],
      ["mode", kind === "streak" ? "endless" : "normal"],
    ];
    if (kind === "streak" && streak <= 0) entries.push(["streak", "5"]);
    setParams(entries);
  }

  // ── Solo results badge override — force specific earned badges instead of
  // deriving them from the stat knobs above (stacking every combination via
  // qtotal/pace/streak/etc. is impractical with 19 interacting thresholds).
  const forcedBadges = $derived(
    (page.url.searchParams.get("badges") ?? "").split(",").filter(Boolean)
  );

  function clearForcedBadges() {
    const url = new URL(page.url.href);
    url.searchParams.delete("badges");
    goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
  }

  // Fires one of the streak flourishes (see mimic/solo layout's
  // `session.streakFlourish`): zeroes the live streak, clears any other
  // flourish param, and sets the one being previewed.
  function setFlourish(param: (typeof FLOURISH_PARAMS)[number], value: number) {
    const url = new URL(page.url.href);
    for (const k of FLOURISH_PARAMS) url.searchParams.delete(k);
    url.searchParams.set("streak", "0");
    url.searchParams.set(param, String(value));
    goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
  }

  function clearFlourish() {
    const url = new URL(page.url.href);
    for (const k of FLOURISH_PARAMS) url.searchParams.delete(k);
    goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
  }

  function toggleBadge(id: string) {
    const next = forcedBadges.includes(id)
      ? forcedBadges.filter((b) => b !== id)
      : [...forcedBadges, id];
    if (next.length === 0) {
      clearForcedBadges();
      return;
    }
    setParam("badges", next.join(","));
  }

  type ModeKey = "quiz" | "solo" | "display" | "errors";
  const currentMode = $derived<ModeKey>(
    isErrors ? "errors"
    : isDisplay ? "display"
    : isSolo ? "solo"
    : "quiz"
  );

  const MODES: { key: ModeKey; label: string; base: string }[] = [
    { key: "quiz", label: "quiz", base: "/mimic/quiz/play" },
    { key: "solo", label: "solo", base: "/mimic/solo/play" },
    { key: "display", label: "display", base: "/mimic/display/play" },
    { key: "errors", label: "errors", base: "/mimic/error/404" },
  ];

  function switchMode(base: string) {
    const url = new URL(page.url.href);
    goto(`${base}?${url.searchParams.toString()}`, { replaceState: false, noScroll: true });
  }

  function navTo(path: string) {
    const url = new URL(page.url.href);
    goto(`${path}?${url.searchParams.toString()}`, { replaceState: false, noScroll: true });
  }

  const QUIZ_NAV = [
    { label: "play", path: "/mimic/quiz/play" },
    { label: "lobby", path: "/mimic/quiz/lobby" },
    { label: "results", path: "/mimic/quiz/results" },
    { label: "roles", path: "/mimic/quiz/roles" },
    { label: "npcs", path: "/mimic/quiz/npcs" },
    { label: "join", path: "/mimic/join" },
    { label: "closed", path: "/mimic/closed" },
  ];
  const SOLO_NAV = [
    { label: "setup", path: "/mimic/solo/setup" },
    { label: "play", path: "/mimic/solo/play" },
    { label: "results", path: "/mimic/solo/results" },
    { label: "board", path: "/mimic/solo/leaderboard" },
    { label: "history", path: "/mimic/history" },
  ];
  const DISPLAY_NAV = [{ label: "play", path: "/mimic/display/play" }];
  const ERRORS_NAV = [
    { label: "403", path: "/mimic/error/403" },
    { label: "404", path: "/mimic/error/404" },
    { label: "500", path: "/mimic/error/500" },
  ];

  const navLinks = $derived(
    isErrors ? ERRORS_NAV
    : isDisplay ? DISPLAY_NAV
    : isSolo ? SOLO_NAV
    : QUIZ_NAV
  );

  // ── Draggable FAB ──────────────────────────────────────────────────────────
  let fabEl = $state<HTMLButtonElement | HTMLAnchorElement | null>(null);
  let viewportWidth = $state(1024);
  let viewportHeight = $state(768);
  const dragFab = new DraggableFab("mimic-fab-pos");

  // Initialise from sessionStorage after mount (fabEl binding signals readiness).
  $effect(() => {
    const el = fabEl;
    if (!el) return;
    dragFab.restore(() => ({
      x: window.innerWidth - el.offsetWidth - 16,
      y: window.innerHeight - el.offsetHeight - 16,
    }));
  });

  // Keep the FAB on-screen if the window is resized after a drag.
  $effect(() => {
    if (!fabEl) return;
    dragFab.clampToViewport(fabEl, viewportWidth, viewportHeight);
  });

  function onFabDown(e: PointerEvent) {
    dragFab.onPointerDown(e);
  }

  function onFabMove(e: PointerEvent) {
    if (dragFab.onPointerMove(e)) open = false; // close panel when drag begins
  }

  function onFabUp(e: PointerEvent) {
    if (dragFab.onPointerUp(e) === "tap") open = !open;
  }

  // The pointer never actually releases on an alt-tab/focus-stealing dialog,
  // so pointer capture can't end the gesture — force it closed here instead.
  function onWindowBlur() {
    dragFab.forceEnd(fabEl ?? undefined);
  }

  // Which edge is the FAB closest to?
  const fabEdge = $derived.by((): "left" | "right" | "top" | "bottom" => {
    if (typeof window === "undefined" || !fabEl || dragFab.x === null || dragFab.y === null) return "bottom";
    const bw = fabEl.offsetWidth, bh = fabEl.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    const cx = dragFab.x + bw / 2, cy = dragFab.y + bh / 2;
    const min = Math.min(cx, vw - cx, cy, vh - cy);
    return min === cx ? "left" : min === vw - cx ? "right" : min === cy ? "top" : "bottom";
  });

  // Inline style for the desktop panel (mobile stays full-screen via classes)
  const panelStyle = $derived.by(() => {
    if (typeof window === "undefined" || !fabEl || dragFab.x === null || dragFab.y === null) return "";
    const baseX = dragFab.x, baseY = dragFab.y;
    const bw = fabEl.offsetWidth, bh = fabEl.offsetHeight;
    const pw = 320, ph = 576;
    const vw = window.innerWidth, vh = window.innerHeight;
    const m = 8, gap = 8;
    switch (fabEdge) {
      case "right":  return `right:${vw - baseX + gap}px; top:${Math.max(m, Math.min(vh - ph - m, baseY))}px`;
      case "left":   return `left:${baseX + bw + gap}px; top:${Math.max(m, Math.min(vh - ph - m, baseY))}px`;
      case "bottom": return `bottom:${vh - baseY + gap}px; right:${Math.max(m, Math.min(vw - pw - m, vw - baseX - bw))}px`;
      case "top":    return `top:${baseY + bh + gap}px; right:${Math.max(m, Math.min(vw - pw - m, vw - baseX - bw))}px`;
    }
  });

  const panelOrigin = $derived(
    fabEdge === "right"  ? "right center"
    : fabEdge === "left" ? "left center"
    : fabEdge === "top"  ? "center top"
    : "center bottom"
  );

  const fabStyle = $derived(dragFab.style(dragFab.isDragging ? "grabbing" : "grab"));
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} onblur={onWindowBlur} />

<!-- Draggable toggle pill -->
<Button
  unstyled
  bind:ref={fabEl}
  type="button"
  onpointerdown={onFabDown}
  onpointermove={onFabMove}
  onpointerup={onFabUp}
  onpointercancel={onFabUp}
  aria-label={open ? "Close dev toolbar" : "Open dev toolbar"}
  aria-expanded={open}
  style={fabStyle}
  class={fabVariants({ tone: "warning", class: "fixed px-3 py-2.5 font-mono text-xs font-semibold" })}
>
  <Icon name="gear" class="size-4" />
  DEV
  <span class="text-foreground-darker/50">·</span>
  <span class="text-[10px] text-warning/70">{currentMode}</span>
  <Icon name="grip" class="size-3 opacity-50" />
</Button>

{#snippet heading(text: string, value?: string)}
  <p class="mb-1 font-mono text-[10px] text-foreground-darker">
    {text}
    {#if value}<span class="text-warning">{value}</span>{/if}
  </p>
{/snippet}

{#snippet pillLabel(o: Opt)}{o.label}{/snippet}
{#snippet modeTile(m: (typeof MODES)[number])}{m.label}{/snippet}
{#snippet navTile(n: (typeof QUIZ_NAV)[number])}{n.label}{/snippet}

{#snippet pills(label: string, options: Opt[], selectedKey: string | null, onSelect: (o: Opt) => void)}
  <div>
    {@render heading(label)}
    <SegmentedPicker
      {options}
      optionKey={(o) => o.key}
      {selectedKey}
      {label}
      {onSelect}
      variant="pill"
      class="flex-wrap gap-1"
      optionClass="px-2 py-0.5 font-mono text-[10px]"
      option={pillLabel}
    />
  </div>
{/snippet}

{#snippet section(title: string, body: Snippet, openByDefault: boolean)}
  <details class="group border-b border-secondary/15" open={openByDefault}>
    <summary class="flex cursor-pointer select-none list-none items-center justify-between px-4 py-2.5 [&::-webkit-details-marker]:hidden">
      <span class="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground-darker group-open:text-warning">{title}</span>
      <Icon name="chevron-down" class="size-3 text-foreground-darker transition-transform group-open:rotate-180" />
    </summary>
    <div class="flex flex-col gap-3 px-4 pb-4">
      {@render body()}
    </div>
  </details>
{/snippet}

{#snippet stateBody()}
  {#if isDisplay}
    {@render pills("View", opts(DISPLAY_VIEWS), dview, (o) => setParam("dview", o.key))}
  {/if}
  {#if isJoin}
    {@render pills("Join error", [{ key: "", label: "—" }, ...opts(JOIN_STATES)], page.url.searchParams.get("joinerr") ?? "", (o) => setParam("joinerr", o.key))}
  {:else if !(isDisplay && (dview === "waiting" || dview === "final"))}
    {@render pills("Qtype", opts(QTYPES, (k) => k.replace("_", " ")), qtype, (o) => setParam("qtype", o.key))}
    {@render pills("Answer", opts(STATES), answerState, (o) => setParam("state", o.key))}
  {/if}
  {@render pills("Difficulty", opts(DIFFICULTIES), difficulty, (o) => setParam("difficulty", o.key))}
  {@render pills("Image", [{ key: "", label: "—" }, ...opts(["dark", "light"])], img, (o) => setParam("img", o.key))}
  {#if isSolo}
    {@render pills("Mode", opts(SOLO_MODES), soloMode, (o) => setParam("mode", o.key))}
  {:else if isQuiz}
    {@render pills("Role", opts(ROLES), role, (o) => setParam("role", o.key))}
    {@render pills("Identity pill", PILL_VARIANTS.map(([key, label]) => ({ key, label: `${key} · ${label}` })), String(pill), (o) => setParam("pill", o.key))}
    <Checkbox id="dev-emotes" size="sm" label="Emotes (picker shows once answered, pre-reveal — state: selected)" checked={emotesParam} onchange={toggleEmotes} />
    <Checkbox id="dev-curator" size="sm" label="Curator toolbox (ADR 0019 — layers over player/observer)" checked={curatorMode} onchange={() => toggleParam("curator", curatorMode)} />
  {/if}
  {#if isSoloResults}
    {@render pills("Result card", [{ key: "leaderboard", label: "leaderboard" }, { key: "streak", label: "streak-only" }, { key: "guest", label: "guest" }], resultEligibility, (o) => setResultEligibility(o.key as ResultEligibility))}
  {/if}
{/snippet}

{#snippet preset(label: string, onclick: () => void)}
  <Button variant="outline" intent="compact" radius="rounded" class="px-1.5 py-0.5 font-mono text-[9px] font-normal" {onclick}>{label}</Button>
{/snippet}

{#snippet controlsBody()}
  <div class="flex flex-col gap-1">
    <Slider id="dev-qindex" size="sm" label="Question" min={0} max={qtotal - 1} value={qindex} format={(v) => `Q${v + 1} / ${qtotal}`} oninput={(e) => setParam("qindex", (e.target as HTMLInputElement).value)} />
    <Slider id="dev-qtotal" size="sm" label="Total" min={1} max={20} value={qtotal} oninput={(e) => setParam("qtotal", (e.target as HTMLInputElement).value)} />
  </div>
  <Slider id="dev-timer" size="sm" label="Timer" min={0} max={60} value={timer} format={(v) => `${v}s`} oninput={(e) => setParam("timer", (e.target as HTMLInputElement).value)} />
  {#if isDisplay}
    <Slider id="dev-players" size="sm" label="Players" min={1} max={10} value={players} oninput={(e) => setParam("players", (e.target as HTMLInputElement).value)} />
  {/if}
  {#if isQuiz && qtype !== "image_matching" && showingResult}
    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        {@render heading("Distribution", `${distRemaining} unanswered`)}
        <div class="mb-1 flex gap-1">
          {@render preset("even", () => setDistPreset("even"))}
          {@render preset("landslide", () => setDistPreset("landslide"))}
          {@render preset("all wrong", () => setDistPreset("allWrong"))}
          {@render preset("reset", () => setDistPreset("reset"))}
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        {#each Array(answerCount) as _, i}
          <Slider id="dev-dist-{i}" size="sm" label="A{i + 1}" min={0} max={botCount} value={distCounts[i] ?? 0} oninput={(e) => setDistSlot(i, parseInt((e.target as HTMLInputElement).value, 10))} aria-label={`Bots on answer ${i + 1}`} />
        {/each}
      </div>
    </div>
  {/if}
  <Slider id="dev-score" size="sm" label="Score" min={0} max={500} step={10} value={score} format={(v) => `${v} pts`} oninput={(e) => setParam("score", (e.target as HTMLInputElement).value)} />
  {#if isQuiz}
    <Slider id="dev-earned" size="sm" label="Earned (pill delta — state: correct)" min={0} max={300} step={5} value={earned} format={(v) => `+${v}`} oninput={(e) => setParam("earned", (e.target as HTMLInputElement).value)} />
  {/if}
  {#if isSolo && soloMode === "endless"}
    <Slider id="dev-strikes" size="sm" label="Strikes" min={0} max={3} value={strikes} format={(v) => `${v} / 3`} oninput={(e) => setParam("strikes", (e.target as HTMLInputElement).value)} />
  {/if}
  {#if isSolo || isQuiz}
    <Slider id="dev-streak" size="sm" label="Streak" min={0} max={GAME.streak.steps.at(-1)?.threshold ?? 12} value={streak} oninput={(e) => setParam("streak", (e.target as HTMLInputElement).value)} />
    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        {@render heading("Flourish")}
        {#if anyFlourishActive}
          <div class="mb-1">{@render preset("clear", clearFlourish)}</div>
        {/if}
      </div>
      <div class="flex flex-col gap-1.5">
        {@render pills("lost", GAME.streak.losses.map((l) => ({ key: String(l.threshold), label: String(l.threshold) })), streakLostParam, (o) => setFlourish("streaklost", Number(o.key)))}
        {@render pills("near", GAME.streak.steps.map((s) => ({ key: String(s.threshold - 1), label: String(s.threshold - 1) })), streakNearMissParam, (o) => setFlourish("streaknearmiss", Number(o.key)))}
        {@render pills("best", [{ key: "8", label: "trigger" }], streakBestParam === null ? null : "8", () => setFlourish("streakbest", 8))}
        {#if isSolo}
          {@render pills("life", Array.from({ length: GAME.endless.lives - 1 }, (_, i) => GAME.endless.lives - 1 - i).map((n) => ({ key: String(n), label: `${n} left` })), streakLifeParam, (o) => setFlourish("streaklife", Number(o.key)))}
        {/if}
      </div>
    </div>
  {/if}
  {#if isSolo}
    <Checkbox id="dev-guest" size="sm" label="Guest (locked options + CTA)" checked={isGuestParam} onchange={() => toggleParam("guest", isGuestParam)} />
  {/if}
  {#if isSoloResults}
    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        {@render heading("Badges", forcedBadges.length > 0 ? `${forcedBadges.length} forced` : "auto")}
        {#if forcedBadges.length > 0}
          <div class="mb-1">{@render preset("auto", clearForcedBadges)}</div>
        {/if}
      </div>
      <div class="flex flex-wrap gap-1" role="group" aria-label="Forced badges">
        {#each BADGE_ORDER as id (id)}
          <Button
            variant="outline"
            intent="compact"
            radius="rounded"
            behavior="toggle"
            data-state={forcedBadges.includes(id) ? "on" : "off"}
            aria-pressed={forcedBadges.includes(id)}
            class="px-1.5 py-1 font-mono text-[9px] font-normal"
            onclick={() => toggleBadge(id)}
          >{BADGES[id].label}</Button>
        {/each}
      </div>
    </div>
  {/if}
  {#if isQuiz}
    <Checkbox id="dev-intermission" size="sm" label="Intermission" checked={intermission} onchange={() => toggleParam("intermission", intermission)} />
  {/if}
  {#if isRoles}
    <Checkbox id="dev-rsubmitted" size="sm" label="Role submitted" checked={rsubmitted} onchange={() => toggleParam("rsubmitted", rsubmitted)} />
    <Checkbox id="dev-rlocked" size="sm" label="Roles locked" checked={rlocked} onchange={() => toggleParam("rlocked", rlocked)} />
  {/if}
  {#if isQuizResults}
    <Checkbox id="dev-anon" size="sm" label="Anonymous player" checked={anon} onchange={() => toggleParam("anon", anon)} />
    <Checkbox id="dev-claimed" size="sm" label="Claimed" checked={claimed} onchange={() => toggleParam("claimed", claimed)} />
  {/if}
{/snippet}

{#snippet copyBody()}
  {#if !isDisplay}
    <Input id="dev-nickname" name="nickname" size="sm" label="Nickname" value={nickname} placeholder="Dev Player" onchange={(e) => setParam("nickname", (e.target as HTMLInputElement).value)} />
  {/if}
  <Input id="dev-category" name="category" size="sm" label="Category" value={category} placeholder="science" onchange={(e) => setParam("category", (e.target as HTMLInputElement).value)} />
  <Input id="dev-qtext" name="qtext" type="textarea" rows={2} size="sm" label="Question" class="min-h-0" value={qtext} placeholder="What is the speed of light…" onchange={(e) => setParam("qtext", (e.target as HTMLTextAreaElement).value)} />
  <div>
    {@render heading(`Answers${qtype === "image_matching" ? " (left|right)" : ""}`)}
    <div class="flex flex-col gap-1">
      {#each Array(answerCount) as _, i}
        <Input id="dev-a{i + 1}" name="a{i + 1}" size="sm" label="A{i + 1}" value={aTexts[i]} onchange={(e) => setParam(`a${i + 1}`, (e.target as HTMLInputElement).value)} />
      {/each}
    </div>
  </div>
{/snippet}

{#snippet roleTile(o: Opt)}{o.label}{/snippet}

{#snippet playersBody()}
  <div class="flex flex-col gap-2">
    {#each castRows as row, i (i)}
      <div class="flex items-end gap-1.5">
        <Input
          id="dev-cast-nickname-{i}"
          name="cast-nickname-{i}"
          size="sm"
          label={i === 0 ? "Nickname" : ""}
          aria-label="Nickname"
          class="min-w-0 flex-1"
          value={row.nickname}
          onchange={(e) => setCastNickname(i, (e.target as HTMLInputElement).value)}
        />
        <SegmentedPicker
          options={opts(ROLES)}
          optionKey={(o) => o.key}
          selectedKey={row.role}
          label={`Role for ${row.nickname}`}
          onSelect={(o) => setCastRole(i, o.key as CastRow["role"])}
          variant="pill"
          class="gap-1"
          optionClass="px-2 py-0.5 font-mono text-[10px]"
          option={roleTile}
        />
        <Button
          variant="ghost"
          intent="icon-inline"
          radius="rounded"
          class="p-2 text-foreground-darker hover:text-foreground"
          aria-label={`Remove ${row.nickname}`}
          disabled={castRows.length <= 1}
          onclick={() => removeCastRow(i)}
        >
          <Icon name="close" class="size-4" />
        </Button>
      </div>
    {/each}
    <Button
      variant="outline"
      intent="compact"
      radius="rounded"
      class="px-2 py-1 font-mono text-[10px] font-normal"
      disabled={castRows.length >= CAST_MAX}
      onclick={addCastRow}
    >
      Add player
    </Button>
  </div>
{/snippet}

{#snippet navFooter()}
  <div class="flex flex-col gap-2">
    <SegmentedPicker
      options={MODES}
      optionKey={(m) => m.key}
      selectedKey={currentMode}
      label="Mimic mode"
      onSelect={(m) => switchMode(m.base)}
      variant="pill"
      class="gap-1"
      optionClass="flex-1 justify-center px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider"
      option={modeTile}
    />
    <SegmentedPicker
      options={navLinks}
      optionKey={(n) => n.path}
      selectedKey={page.url.pathname}
      label="Mimic page"
      onSelect={(n) => navTo(n.path)}
      variant="pill"
      class="flex-wrap gap-1"
      optionClass="px-2 py-0.5 font-mono text-[10px]"
      option={navTile}
    />
  </div>
{/snippet}

{#snippet sections()}
  {@render section("State", stateBody, true)}
  {@render section("Controls", controlsBody, true)}
  {#if isQuiz}
    {@render section("Players", playersBody, false)}
  {/if}
  {@render section("Copy", copyBody, false)}
{/snippet}

<!-- Mobile: bottom sheet -->
{#if !isDesktop}
  <ResponsiveOverlay
    id="mimic-dev-sheet"
    open={open}
    mode="drawer"
    ariaLabel="Dev toolbar"
    bodyClass="px-0! pt-0! sm:px-0!"
    footer={navFooter}
    onClose={() => (open = false)}
  >
    {@render sections()}
  </ResponsiveOverlay>
{/if}

<!-- Desktop: non-modal panel next to the FAB, so the page stays live under it -->
{#if open && isDesktop}
  <Card
    padding="none"
    variant="ground"
    role="dialog"
    aria-label="Dev toolbar"
    class="fixed z-50 max-h-144 w-80 animate-pop-in gap-0 overflow-hidden border-warning/30 bg-background/95 shadow-2xl backdrop-blur-md"
    style="transform-origin: {panelOrigin}; {panelStyle}"
  >
    <div class="flex shrink-0 items-center justify-between border-b border-secondary/15 px-4 py-2.5">
      <span class="font-mono text-[10px] font-bold uppercase tracking-widest text-warning">Mimic</span>
      <Button variant="ghost" intent="icon-inline" radius="rounded" class="p-0.5 text-foreground-darker hover:text-foreground" aria-label="Close" onclick={() => (open = false)}>
        <Icon name="x" class="size-3.5" />
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto">
      {@render sections()}
    </div>
    <div class="shrink-0 border-t border-secondary/15 px-4 py-3">
      {@render navFooter()}
    </div>
  </Card>
{/if}
