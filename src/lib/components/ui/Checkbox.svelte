<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn, tv } from "tailwind-variants";
  import { scale } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import Icon from './Icon.svelte';

  const checkboxControlVariants = tv({
    base: [
      "relative flex shrink-0 items-center justify-center",
      "rounded-lg corner-shape-squircle border-2",
      "",
    ],
    variants: {
      size: {
        sm: "size-4",
        default: "size-6",
      },
      state: {
        unchecked:
          "border-secondary/25 bg-background-lighter/20 group-hover:border-secondary/50",
        checked: "border-secondary bg-secondary",
        error: "border-danger/70 bg-background-lighter/20",
      },
    },
    defaultVariants: {
      size: "default",
      state: "unchecked",
    },
  });

  let {
    id,
    label,
    name,
    description,
    error,
    disabled = false,
    size,
    class: className = "",
    checked = $bindable(false),
    ...props
  }: {
    id: string;
    label: string;
    name?: string;
    description?: string;
    error?: string;
    disabled?: boolean;
    size?: VariantProps<typeof checkboxControlVariants>["size"];
    class?: string;
    checked?: boolean;
  } & Omit<
    HTMLInputAttributes,
    "id" | "name" | "type" | "checked" | "disabled" | "size" | "class"
  > = $props();

  const describedBy = $derived(
    [description ? `${id}-desc` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  );

  let focused = $state(false);

  const controlState = $derived<VariantProps<typeof checkboxControlVariants>["state"]>(
    error ? "error" : checked ? "checked" : "unchecked"
  );

  const controlCls = $derived(
    cn(
      checkboxControlVariants({ size, state: controlState }),
      focused && "ring-2 ring-secondary/30 ring-offset-2 ring-offset-background"
    )
  );
</script>

<div class="flex flex-col gap-1 {className}">
  <label
    for={id}
    class="group flex cursor-pointer select-none items-center gap-3"
    class:opacity-40={disabled}
    class:pointer-events-none={disabled}
  >
    <input
      {id}
      {name}
      type="checkbox"
      {disabled}
      class="sr-only"
      bind:checked
      onfocus={() => { focused = true; }}
      onblur={() => { focused = false; }}
      aria-describedby={describedBy}
      aria-invalid={error ? "true" : undefined}
      {...props}
    />

    <!-- Custom control, sibling after the sr-only input so peer-* works if needed -->
    <span class="{controlCls} mt-0.5 group-active:scale-[0.88]" aria-hidden="true">
      {#if checked}
        <!-- <svg
          viewBox="0 0 10 8"
          class="size-4 text-background"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          in:scale={{ duration: 150, start: 0.4, easing: cubicOut }}
          out:scale={{ duration: 80, start: 0.4, easing: cubicOut }}
        >
          <polyline points="1,4.5 3.5,7 9,1" />
        </svg> -->
        <Icon name="check" class="text-background size-4" />
      {/if}
    </span>

    <span class="flex flex-col gap-0.5 pt-0.5">
      <span class={size === "sm" ? "font-mono text-xs" : "text-lg"}>{label}</span>
      {#if description}
        <p id="{id}-desc" class="text-sm text-foreground-darker">{description}</p>
      {/if}
    </span>
  </label>

  {#if error}
    <p id="{id}-error" class="pl-8 text-sm text-danger" role="alert">{error}</p>
  {/if}
</div>
