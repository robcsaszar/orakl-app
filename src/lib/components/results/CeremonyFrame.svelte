<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import { cn } from "tailwind-variants";

  let {
    kicker,
    title,
    subtitle = "",
    align = "left",
    aside,
    children,
    class: className = "",
  }: {
    kicker: string;
    title: string;
    subtitle?: string;
    align?: "left" | "center";
    aside?: Snippet;
    children?: Snippet;
    class?: string;
  } = $props();

  const centered = $derived(align === "center");
</script>

<section
  class="relative overflow-hidden rounded-4xl corner-shape-squircle border-2 border-transparent bg-background-lighter/18 p-5 shadow-xl backdrop-blur-md md:p-8"
>
  <div
    class="pointer-events-none absolute inset-x-12 top-0 h-0.5 bg-linear-to-r from-transparent via-gold-lighter/65 to-transparent"
    aria-hidden="true"
  ></div>
  <div
    class="pointer-events-none absolute -top-20 left-1/2 size-48 -translate-x-1/2 rounded-full bg-gold/14 blur-3xl"
    aria-hidden="true"
  ></div>
  <div
    class="pointer-events-none absolute -right-10 top-10 size-32 rounded-full bg-background-lighter blur-3xl"
    aria-hidden="true"
  ></div>
  <div
    class="pointer-events-none absolute inset-x-8 bottom-0 h-0.5 bg-linear-to-r from-transparent via-foreground-darker/20 to-transparent"
    aria-hidden="true"
  ></div>

  <div class="relative flex flex-col gap-6">
    <div
      class={cn([
        `flex flex-col gap-4 ${centered ? "items-center text-center" : "md:flex-row md:items-start md:justify-between"}`,
      ])}
    >
      <div
        class={cn([
          `space-y-3 ${centered ? "max-w-2xl items-center" : "max-w-2xl"}`,
        ])}
      >
        <div
          class={cn([
            `inline-flex items-center gap-2 text-gold-lightest ${centered ? "self-center" : ""}`,
          ])}
        >
          <Icon name="wreath" />
          <span>{kicker}</span>
        </div>
        <div class="space-y-2">
          <h2
            class="font-serif text-3xl leading-tight text-foreground text-balance md:text-5xl"
          >
            {title}
          </h2>
          {#if subtitle}
            <p
              class="max-w-2xl text-sm leading-6 text-foreground-darker md:text-base"
            >
              {subtitle}
            </p>
          {/if}
        </div>
      </div>

      {#if aside}
        <div class={centered ? "" : "md:shrink-0"}>{@render aside()}</div>
      {/if}
    </div>

    {#if children}
      <div class={cn([`relative`, className])}>
        {@render children()}
      </div>
    {/if}
  </div>
</section>
