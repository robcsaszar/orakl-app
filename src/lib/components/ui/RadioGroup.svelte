<script lang="ts" generics="T extends string | number">
  import type { Snippet } from "svelte";
  import type { HTMLLabelAttributes } from "svelte/elements";
  import { cn } from "tailwind-variants";
  import Icon from "./Icon.svelte";
  import RadioOption from "./RadioOption.svelte";
  import FieldDescription from "./partials/FieldDescription.svelte";

  let {
    options,
    selected = $bindable(),
    name,
    legend,
    hint,
    description,
    optionLabel,
    class: className = "",
    onchange,
    lockedOptions,
    onLocked,
    ...props
  }: {
    /** May be dynamic — re-render follows the array. */
    options: readonly T[];
    selected: T;
    name: string;
    legend: string;
    /** Muted text beside the legend */
    hint?: string;
    description?: string | Snippet;
    optionLabel: Snippet<[T]>;
    /** Applied to every option tile */
    class?: string;
    onchange?: () => void;
    /** Options the current user can't pick (e.g. guest entitlements). */
    lockedOptions?: readonly T[];
    /** Fired when a locked option is clicked — surface an explanation/CTA. */
    onLocked?: (option: T) => void;
  } & Omit<HTMLLabelAttributes, "class" | "for" | "onclick"> = $props();

  const lockedSet = $derived(new Set(lockedOptions ?? []));
</script>

<div class="flex flex-col gap-4 group">
  <p id="{name}-legend" class="items-baseline flex gap-2 px-0 text-xl m-0">
    {legend}
    {#if hint}
      <span class="text-foreground-darker font-sans text-sm">{hint}</span>
    {/if}
  </p>
  <div class="flex gap-2 items-start flex-wrap" role="radiogroup" aria-labelledby="{name}-legend">
    {#each options as option (option)}
      {@const locked = lockedSet.has(option)}
      <RadioOption
        for={`${name}-${option}`}
        {locked}
        class={cn("has-checked:text-background", className)}
        aria-disabled={locked || undefined}
        {...props}
        onclick={locked
          ? (e: MouseEvent) => {
              e.preventDefault();
              onLocked?.(option);
            }
          : undefined}
      >
        <input
          type="radio"
          bind:group={selected}
          value={option}
          {name}
          id={`${name}-${option}`}
          class="sr-only"
          disabled={locked}
          {onchange}
        />
        {@render optionLabel(option)}
        {#if locked}
          <span class="absolute right-1.5 top-1.5" aria-hidden="true">
            <Icon name="lock" class="size-3.5" />
          </span>
          <span class="sr-only">(locked — sign in to unlock)</span>
        {/if}
      </RadioOption>
    {/each}
  </div>
  {#if description}
    <FieldDescription {description} id="{name}-description" />
  {/if}
</div>
