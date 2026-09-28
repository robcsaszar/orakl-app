<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn } from "tailwind-variants";
  import { buttonVariants } from "@/lib/button-variants";
  import Icon from "./Icon.svelte";

  type ButtonVariants = VariantProps<typeof buttonVariants>;

  let {
    variant = "primary",
    intent,
    radius,
    behavior,
    iconBefore,
    iconAfter,
    loading = false,
    unstyled = false,
    class: className = "",
    href,
    children,
    ref = $bindable(null),
    ...props
  }: {
    variant?: ButtonVariants["variant"];
    intent?: ButtonVariants["intent"];
    radius?: ButtonVariants["radius"];
    behavior?: ButtonVariants["behavior"];
    iconBefore?: string;
    iconAfter?: string;
    loading?: boolean;
    /** Render with only `class` — no buttonVariants base/variant styling. */
    unstyled?: boolean;
    class?: string;
    href?: string;
    children?: Snippet;
    /** The rendered element (bind:this passthrough) */
    ref?: HTMLButtonElement | HTMLAnchorElement | null;
  } & (HTMLButtonAttributes | HTMLAnchorAttributes) = $props();

  const cls = $derived(
    unstyled
      ? className
      : cn(buttonVariants({ variant, intent, radius, behavior, class: className })),
  );
  const disabled = $derived(variant === "disabled");
</script>

{#snippet content()}
  {#if loading}
    <span class="is-loading flex">Loading<span>.</span><span>.</span><span>.</span></span>
  {:else}
    {#if iconBefore}<Icon name={iconBefore} />{/if}
    {@render children?.()}
    {#if iconAfter}
      <Icon name={iconAfter} class="transition-transform duration-300 group-hover:translate-x-1 group-focus:translate-x-1 group-active:translate-x-1" />
    {/if}
  {/if}
{/snippet}

{#if href && !disabled}
  <a bind:this={ref} {href} class={cls} {...(props as HTMLAnchorAttributes)}>
    {@render content()}
  </a>
{:else}
  <button
    bind:this={ref}
    class={cls}
    disabled={disabled || (props as HTMLButtonAttributes).disabled}
    aria-disabled={disabled || undefined}
    {...(props as HTMLButtonAttributes)}
  >
    {@render content()}
  </button>
{/if}
