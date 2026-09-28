<script lang="ts">
  import Icon from "@/lib/components/ui/Icon.svelte";
  import { tv, type VariantProps } from "tailwind-variants";

  const statVariants = tv({
    base: "rounded-4xl flex flex-col gap-4 items-end corner-shape-squircle border-2 px-4 py-3 backdrop-blur-xs",
    variants: {
      tone: {
        primary: "border-primary bg-primary text-background",
        secondary: "border-secondary bg-secondary text-background",
        success: "border-success/30 bg-success-dark/50 text-success-light",
        warning: "border-warning/30 bg-warning-dark/20 text-warning-light",
        neutral: "border-secondary/20 bg-background/50 text-foreground",
        flame: "border-flame/30 bg-flame-dark/50 text-flame-light",
      },
    },
    defaultVariants: { tone: "primary" },
  });

  let {
    label,
    value,
    tone = "primary",
    class: className = "",
  }: {
    label: string;
    value: string | number;
    tone?: VariantProps<typeof statVariants>["tone"];
    class?: string;
  } = $props();
</script>

<div class={statVariants({ tone, class: className })}>
  <p
    class="text-small font-sans font-bold uppercase tracking-widest text-current/70"
  >
    {label}
  </p>
  <p
    class="font-mono text-2xl font-bold tabular-nums md:text-3xl flex gap-2 items-center"
  >
    {#if tone === "flame"}
      <Icon name="flame" class="size-5 shrink-0 text-flame-light" />
    {/if}{value}
  </p>
</div>
