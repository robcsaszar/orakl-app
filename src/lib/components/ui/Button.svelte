<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn } from "tailwind-variants";
  import { buttonVariants } from "@/lib/button-variants";
  import type { IconUsage } from "$lib/icon-usages";
  import type { RoleName } from "$lib/icons";
  import Icon from "./Icon.svelte";

  type ButtonVariants = VariantProps<typeof buttonVariants>;

  /** A button with an icon names where that icon renders (`iconUsage`). */
  type IconProps =
    | { iconBefore?: undefined; iconAfter?: undefined; iconUsage?: undefined }
    | { iconBefore: RoleName; iconAfter?: RoleName; iconUsage: IconUsage }
    | { iconBefore?: RoleName; iconAfter: RoleName; iconUsage: IconUsage };

  let {
    variant = "primary",
    intent,
    radius,
    behavior,
    iconBefore,
    iconAfter,
    iconUsage,
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
    loading?: boolean;
    /** Render with only `class` — no buttonVariants base/variant styling. */
    unstyled?: boolean;
    class?: string;
    href?: string;
    children?: Snippet;
    /** The rendered element (bind:this passthrough) */
    ref?: HTMLButtonElement | HTMLAnchorElement | null;
  } & IconProps & (HTMLButtonAttributes | HTMLAnchorAttributes) = $props();

  const cls = $derived(
    unstyled
      ? className
      : cn(buttonVariants({ variant, intent, radius, behavior, class: className })),
  );
  const iconStep = $derived(intent === "compact" ? "sm" : "md");
  const disabled = $derived(variant === "disabled");
</script>

{#snippet content()}
  {#if loading}
    <span class="is-loading flex">Loading<span>.</span><span>.</span><span>.</span></span>
  {:else}
    {#if iconBefore}<Icon name={iconBefore} usage={iconUsage as IconUsage} size={iconStep} />{/if}
    {@render children?.()}
    {#if iconAfter}
      <Icon name={iconAfter} usage={iconUsage as IconUsage} size={iconStep} class="transition-transform duration-300 group-hover:translate-x-1 group-focus:translate-x-1 group-active:translate-x-1" />
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
