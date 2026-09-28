<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLSelectAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn, tv } from "tailwind-variants";

  // Same border/fill recipe as Input.
  const selectVariants = tv({
    base: [
      "form-select w-full border-2 backdrop-blur-xs rounded-2xl corner-shape-squircle cursor-pointer",
      "bg-background-lighter/25 text-foreground border-secondary/50",
      "focus-visible:outline-hidden focus-visible:ring-transparent focus-visible:border-secondary focus-visible:bg-background/50",
      "disabled:border-transparent disabled:cursor-not-allowed disabled:opacity-60",
    ],
    variants: {
      size: {
        default: "p-2.5 pr-10",
        compact: "px-2 py-1 pr-8 text-sm",
      },
    },
    defaultVariants: { size: "default" },
  });

  let {
    id,
    label,
    hideLabel = false,
    name,
    value = $bindable(""),
    size,
    class: className = "",
    description,
    error,
    children,
    ...props
  }: {
    id: string;
    label: string;
    /** Keep the label for assistive tech only */
    hideLabel?: boolean;
    name?: string;
    value?: string;
    size?: VariantProps<typeof selectVariants>["size"];
    class?: string;
    description?: string;
    error?: string;
    /** `<option>` elements */
    children?: Snippet;
  } & Omit<HTMLSelectAttributes, "id" | "name" | "value" | "class" | "size"> = $props();

  const describedBy = $derived(
    [description ? `${id}-desc` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") ||
      undefined,
  );
</script>

<label for={id} class="flex flex-1 flex-col gap-2 group">
  <span class={cn("order-1 flex min-h-8 items-baseline gap-2 text-lg", hideLabel && "sr-only")}>
    {label}
  </span>
  {#if description}
    <p id="{id}-desc" class="order-2 text-sm text-foreground-darker">{description}</p>
  {/if}
  <select
    {id}
    {name}
    class={cn("order-3", selectVariants({ size, class: className }))}
    aria-describedby={describedBy}
    aria-invalid={error ? "true" : undefined}
    bind:value
    {...props}
  >
    {@render children?.()}
  </select>
  {#if error}
    <p id="{id}-error" class="order-4 text-sm text-danger" role="alert">{error}</p>
  {/if}
</label>
