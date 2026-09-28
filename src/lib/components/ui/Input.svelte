<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLInputAttributes, HTMLTextareaAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn, tv } from "tailwind-variants";
  import Icon from "./Icon.svelte";
  import PasswordStrength from "./PasswordStrength.svelte";

  const inputVariants = tv({
    base: [
      "w-full border-2 backdrop-blur-xs rounded-2xl corner-shape-squircle",
      "bg-background-lighter/25",
      "text-foreground placeholder:text-foreground-darker/25 ",
      "border-secondary/50",
      "focus-visible:outline-hidden focus-visible:ring-transparent focus-visible:border-secondary focus-visible:placeholder:text-foreground-darker/10 focus-visible:bg-background/50",
      "disabled:border-transparent",
    ],
    variants: {
      variant: {
        default: "form-input leading-[normal]",
        textarea: "form-textarea resize-none min-h-20 field-sizing-content",
      },
      size: {
        sm: "rounded-lg px-2 py-1 font-mono text-xs",
        default: "p-2.5",
        large: "p-3",
      },
      color: {
        default: "",
        error:
          "border-danger/70 focus-visible:ring-danger focus-visible:border-danger/0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      color: "default",
    },
  });

  type InputType = "text" | "email" | "tel" | "url" | "color" | "textarea" | "password" | "number" | "search";

  let {
    id,
    label,
    name,
    required,
    placeholder,
    type = "text" as InputType,
    rows = 5,
    variant,
    size,
    class: className = "",
    labelEnd,
    labelEndJustify = "between",
    inputEnd,
    description,
    error,
    showStrength = false,
    value = $bindable(""),
    inputRef = $bindable<HTMLInputElement | HTMLTextAreaElement | null>(null),
    ...props
  }: {
    id: string;
    label: string;
    name: string;
    required?: string;
    placeholder?: string;
    type?: InputType;
    rows?: number;
    variant?: VariantProps<typeof inputVariants>["variant"];
    size?: VariantProps<typeof inputVariants>["size"];
    class?: string;
    labelEnd?: Snippet;
    labelEndJustify?: "start" | "end" | "between";
    inputEnd?: Snippet;
    description?: string;
    error?: string;
    showStrength?: boolean;
    value?: string;
    inputRef?: HTMLInputElement | HTMLTextAreaElement | null;
  } & Omit<
    HTMLInputAttributes,
    "id" | "name" | "required" | "value" | "placeholder" | "type" | "size" | "class"
  > = $props();

  const isTextarea = $derived(type === "textarea" || name === "message");
  const isPassword = $derived(type === "password");
  const computedVariant = $derived(variant ?? (isTextarea ? "textarea" : "default"));
  const computedColor = $derived<VariantProps<typeof inputVariants>["color"]>(
    error ? "error" : "default"
  );
  const cls = $derived(
    cn(inputVariants({ variant: computedVariant, size, color: computedColor, class: className }))
  );

  let showPassword = $state(false);
  let showStrengthPopover = $state(false);

  const inputType = $derived(isPassword && showPassword ? "text" : type);

  const anchorName = $derived(`--pw-${id}`);
  const strengthId = $derived(`${id}-strength`);

  const describedBy = $derived(
    [description ? `${id}-desc` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  );

  function handleInvalid(e: Event) {
    if (required) (e.target as HTMLInputElement).setCustomValidity(required);
  }
  function handleInput(e: Event) {
    (e.target as HTMLInputElement).setCustomValidity("");
  }
  function toggleReveal() {
    showPassword = !showPassword;
  }
  function showStrPopover() {
    // if (!isPassword || !showStrength) return;
    // const popover = document.getElementById(strengthId);
    // if (popover) popover.showPopover();
    showStrengthPopover = true;
  }
  function hideStrPopover() {
    // if (!isPassword || !showStrength) return;
    // const popover = document.getElementById(strengthId);
    // if (popover) popover.hidePopover();
    showStrengthPopover = false;
  }
  function toggleStrPopover() {
    // if (!isPassword || !showStrength) return;
    // const popover = document.getElementById(strengthId);
    // if (popover) popover.togglePopover();
    showStrengthPopover = !showStrengthPopover;
  }

  // Show/hide popover based on focus and showStrength flag
  $effect(() => {
    const popover = document.getElementById(strengthId);
    if (!popover) return;
    if (showStrengthPopover) popover.showPopover();
    else popover.hidePopover();
  });
</script>

<label for={id} class="flex flex-1 flex-col gap-2 group">
  <div class="relative order-3 flex gap-2 items-center justify-center self-stretch flex-1" style="anchor-name: {anchorName}" >
    {#if isTextarea}
      <textarea
        bind:this={inputRef}
        {id}
        {name}
        required={!!required}
        spellcheck={true}
        {placeholder}
        oninvalid={handleInvalid}
        oninput={handleInput}
        {rows}
        class={cls}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        bind:value
        {...(props as unknown as HTMLTextareaAttributes)}
      ></textarea>
    {:else}
      <input
        bind:this={inputRef}
        {id}
        {name}
        type={inputType}
        required={!!required}
        spellcheck={false}
        {placeholder}
        oninvalid={handleInvalid}
        oninput={handleInput}
        onfocusin={showStrPopover}
        onfocusout={hideStrPopover}
        class={cn(cls, isPassword && (showStrength ? "pr-20 font-mono" : "pr-10"), isPassword && "font-mono")}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        aria-required={required ? "true" : undefined}
        bind:value
        {...props}
      />
    {/if}

    {@render inputEnd?.()}

    {#if isPassword}
      {#if showStrength && !showStrengthPopover}
        <button
          type="button"
          onclick={toggleStrPopover}
          disabled={props.disabled}
          class="pw-btn absolute inset-y-0 end-10 z-10 flex items-center px-3 text-foreground-darker hover:text-foreground focus-visible:outline-none focus-visible:bg-secondary focus-visible:text-background focus-visible:transition-none disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Password strength"
          aria-haspopup="dialog"
        >
          <Icon name="shield" class="size-6" />
        </button>
      {/if}
      {#if showStrength && showStrengthPopover}
        <button
          type="button"
          onclick={hideStrPopover}
          disabled={props.disabled}
          class="pw-btn absolute inset-y-0 end-10 z-10 flex items-center px-3 text-foreground-darker hover:text-foreground focus-visible:outline-none focus-visible:bg-secondary focus-visible:text-background focus-visible:transition-none disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Password strength"
          aria-haspopup="dialog"
        >
          <Icon name="x" class="size-6" />
        </button>
      {/if}
      <button
        type="button"
        disabled={props.disabled}
        class="pw-btn absolute inset-y-0 end-0 z-10 flex items-center px-3 text-foreground-darker hover:text-foreground focus-visible:outline-none focus-visible:bg-secondary focus-visible:text-background rounded-r-2xl focus-visible:transition-none  corner-shape-squircle disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        onclick={toggleReveal}
      >
        <Icon name={showPassword ? "orakl-closed" : "orakl"} />
      </button>
    {/if}
  </div>

  {#if isPassword && showStrength}
    <PasswordStrength id={strengthId} anchorEl={inputRef} value={value as string} />
  {/if}

  {#if error}
    <p id="{id}-error" class="order-4 text-sm text-danger" role="alert">{error}</p>
  {/if}

  {#if label}
    <span class="order-1 flex {size === 'sm' ? 'min-h-0' : 'min-h-8'} flex-nowrap items-baseline justify-{labelEndJustify} gap-2">
      <span class={cn("flex items-center gap-1", size === "sm" ? "font-mono text-xs" : "text-lg")}>
        {label}
        {#if required}<Icon name="asterisk" class="text-danger size-4 self-start stroke-3" />{/if}
      </span>
      {@render labelEnd?.()}
    </span>
  {/if}

  {#if description}
    <p id="{id}-desc" class="order-2 text-sm text-foreground-darker">{description}</p>
  {/if}
</label>

<style>
  .pw-btn {
    transition: color 150ms ease-out, transform 150ms ease-out;
  }
  .pw-btn:active {
    transform: scale(0.97);
  }
</style>
