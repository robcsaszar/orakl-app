<script lang="ts">
  import type { Snippet } from "svelte";
  import type { VariantProps } from "tailwind-variants";
  import { tv } from "tailwind-variants";
  import Avatar from "@/lib/components/ui/Avatar.svelte";

  const rowVariants = tv({
    base: [
      "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3",
      "rounded-l-4xl rounded-r-xl border-2 p-3",
    ],
    variants: {
      variant: {
        default: "border-secondary/10 bg-background/10",
        rank1: "border-gold bg-gold/20 text-gold-lightest",
        rank2: "border-silver bg-silver/20 text-silver-lightest",
        rank3: "border-bronze bg-bronze/20 text-bronze-lightest",
        ranked: "border-secondary/20 bg-background/10",
        highlighted: "border-secondary-700 bg-secondary-900/30",
      },
    },
    defaultVariants: { variant: "default" },
  });

  const chipVariants = tv({
    base: [
      "flex shrink-0 items-center justify-center",
      "rounded-full border-2",
      "font-mono text-lg font-bold tabular-nums",
      "size-9",
    ],
    variants: {
      placement: {
        top1: "border-gold/50 bg-gold-darker/20 text-gold-lighter",
        top2: "border-silver/50 bg-silver-darker/20 text-silver-lighter",
        top3: "border-bronze/50 bg-bronze-darker/20 text-bronze-lighter",
        other: "border-secondary/20 bg-background-lighter text-foreground-darker",
      },
    },
    defaultVariants: { placement: "other" },
  });

  type RowVariant = VariantProps<typeof rowVariants>["variant"];
  type ChipPlacement = VariantProps<typeof chipVariants>["placement"];

  let {
    nickname,
    avatarSrc,
    prefix,
    suffix,
    rank,
    score,
    variant,
    badge,
    actions,
    name,
    size = "md",
    class: className = "",
  }: {
    nickname: string;
    avatarSrc?: string;
    prefix?: string;
    suffix?: string;
    /** 1-based placement; drives row accent and chip colour when no `variant` is set. */
    rank?: number;
    score?: number | string;
    variant?: RowVariant;
    badge?: Snippet;
    actions?: Snippet;
    /** Replaces the nickname text (e.g. an inline editor) */
    name?: Snippet;
    /** `lg` = room-scale nickname with always-visible prefix/suffix, one row per line; for displays. */
    size?: "md" | "lg";
    class?: string;
  } = $props();

  const lg = $derived(size === "lg");
  const affixClass = $derived(
    lg
      ? "truncate text-base text-current/66"
      : "shrink-0 text-sm text-current/66 md:flex hidden",
  );

  const resolvedVariant = $derived<RowVariant>(
    variant ??
      (rank === 1
        ? "rank1"
        : rank === 2
          ? "rank2"
          : rank === 3
            ? "rank3"
            : rank !== undefined
              ? "ranked"
              : "default"),
  );

  const chipPlacement = $derived<ChipPlacement>(
    rank === 1 ? "top1" : rank === 2 ? "top2" : rank === 3 ? "top3" : "other",
  );
</script>

<div class={rowVariants({ variant: resolvedVariant, class: className })}>

  <!--
    Mobile: a flex bar — rank chip left, score right (ml-auto).
    Desktop: sm:contents dissolves this div; rank/score become direct flex
    children of the outer row, ordered via sm:order-*.
  -->
  {#if rank !== undefined || score !== undefined}
    <div class="flex items-center sm:contents">
      {#if rank !== undefined}
        <span
          class="{chipVariants({ placement: chipPlacement })} sm:order-1"
          aria-label="Rank {rank}"
        >
          {rank}
        </span>
      {/if}
      {#if score !== undefined}
        <span class="ml-auto sm:ml-0 sm:order-4 shrink-0 font-mono text-3xl font-bold tabular-nums text-current">
          {score}
        </span>
      {/if}
    </div>
  {/if}

  <!-- Identity: avatar + name + snippet badges -->
  <div class="flex items-center gap-3 sm:order-2 sm:flex-1 min-w-0">
    <Avatar src={avatarSrc} alt={nickname} size="md" />
    <div class="min-w-0 flex-1 flex flex-nowrap items-baseline">
      <span class="flex items-baseline gap-1 min-w-0" class:flex-1={!!name}>
        {#if prefix}
          <span class={affixClass}>{prefix}</span>
        {/if}
        {#if name}
          {@render name()}
        {:else}
          <span class="font-semibold text-current {lg ? 'shrink-0 text-2xl' : 'truncate text-2xl md:text-xl'}">{nickname}</span>
        {/if}
      </span>
      {#if suffix}
        <span class={affixClass}>{suffix}</span>
      {/if}
      {#if badge}
        <span class="flex items-center self-stretch mx-2">
          {@render badge()}
        </span>
      {/if}
    </div>
  </div>

  <!-- Action buttons -->
  {#if actions}
    <div class="flex shrink-0 items-center gap-1 sm:order-3">
      {@render actions()}
    </div>
  {/if}
</div>
