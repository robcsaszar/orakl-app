<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import type { VariantProps } from "tailwind-variants";
  import { cn, tv } from "tailwind-variants";
  import Link from "./Link.svelte";

  const tileVariants = tv({
    base: "group flex corner-shape-squircle focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    variants: {
      variant: {
        tile: [
          "flex-col items-start gap-1 rounded-2xl border-2 border-secondary/25 p-3 text-left",
          "hover:border-secondary-400 hover:bg-secondary-900/30",
          "aria-checked:border-foreground-darker aria-checked:bg-foreground-darker aria-checked:text-background",
          "aria-[current=page]:border-foreground-darker aria-[current=page]:bg-foreground-darker aria-[current=page]:text-background",
        ],
        pill: [
          "items-center gap-1 rounded-2xl px-3 py-1 text-sm text-foreground-darker hover:text-foreground",
          "aria-checked:bg-primary aria-checked:text-background",
          "aria-[current=page]:bg-primary aria-[current=page]:text-background",
        ],
      },
    },
    defaultVariants: { variant: "tile" },
  });

  let {
    options,
    selectedKey,
    optionKey = (o: T) => String(o),
    label,
    onSelect,
    hrefFor,
    variant,
    class: className = "",
    optionClass = "",
    option,
  }: {
    options: readonly T[];
    /** Key of the current option (see `optionKey`); null for none */
    selectedKey: string | null;
    optionKey?: (option: T) => string;
    /** Accessible name of the group */
    label: string;
    /** Picker mode: fires on click and arrow keys (role="radiogroup") */
    onSelect?: (option: T) => void;
    /** Tab mode: options render as links with aria-current (a <nav>) */
    hrefFor?: (option: T) => string;
    variant?: VariantProps<typeof tileVariants>["variant"];
    class?: string;
    optionClass?: string;
    /** Tile content; second arg is whether it is the selected one */
    option: Snippet<[T, boolean]>;
  } = $props();

  const tileClass = $derived(cn(tileVariants({ variant }), optionClass));
  const isSelected = (o: T) => optionKey(o) === selectedKey;
  const anySelected = $derived(options.some(isSelected));

  function onKeydown(e: KeyboardEvent, index: number) {
    const n = options.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    onSelect?.(options[next]);
    const radios = (e.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
    radios?.[next]?.focus();
  }
</script>

{#if hrefFor}
  <nav aria-label={label} class={cn("flex flex-wrap gap-2", className)}>
    {#each options as o (optionKey(o))}
      {@const selected = isSelected(o)}
      <Link
        href={hrefFor(o)}
        samePageHint={false}
        showCurrent={false}
        aria-current={selected ? "page" : undefined}
        class={tileClass}
      >
        {@render option(o, selected)}
      </Link>
    {/each}
  </nav>
{:else}
  <div role="radiogroup" aria-label={label} class={cn("flex flex-wrap gap-2", className)}>
    {#each options as o, i (optionKey(o))}
      {@const selected = isSelected(o)}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        tabindex={selected || (!anySelected && i === 0) ? 0 : -1}
        data-value={optionKey(o)}
        class={tileClass}
        onclick={() => onSelect?.(o)}
        onkeydown={(e) => onKeydown(e, i)}
      >
        {@render option(o, selected)}
      </button>
    {/each}
  </div>
{/if}
