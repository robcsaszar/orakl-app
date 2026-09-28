<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLLabelAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn } from "tailwind-variants";
  import { checkboxOptionVariants } from "@/lib/constants/styles.constants";

  let {
    variant,
    locked = false,
    id,
    name,
    value,
    checked = $bindable(false),
    disabled = false,
    describedBy,
    onchange,
    class: className = "",
    children,
    ...props
  }: {
    variant?: VariantProps<typeof checkboxOptionVariants>["variant"];
    locked?: boolean;
    /** Given an `id`, the option renders its own hidden checkbox; otherwise children supply one. */
    id?: string;
    name?: string;
    value?: string;
    checked?: boolean;
    disabled?: boolean;
    describedBy?: string;
    onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    class?: string;
    children?: Snippet;
  } & Omit<HTMLLabelAttributes, "for" | "onchange"> = $props();
</script>

<label
  for={id}
  class={cn(checkboxOptionVariants({ variant, locked, class: className }))}
  {...props}
>
  {#if id}
    <input
      {id}
      {name}
      {value}
      type="checkbox"
      class="sr-only"
      bind:checked
      {disabled}
      aria-describedby={describedBy}
      {onchange}
    />
  {/if}
  {@render children?.()}
</label>
