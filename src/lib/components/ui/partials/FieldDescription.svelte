<script lang="ts">
  import Icon from "../Icon.svelte";
  import type { Snippet } from 'svelte';
  import { cn } from "tailwind-variants";
  import { isPowerUser } from "@/lib/svelte/powerUser.svelte.js";

  let {
    description,
    id,
    icon = "info",
  }: {
    description: string | Snippet;
    id: string;
    icon?: "info" | "question" | "candle" | "bulbs";
  } = $props();

  let open = $state(false);

  // `is-power-user`: no toggle, no visible copy. The text stays in the DOM for
  // screen readers, so an `aria-describedby` pointing here still resolves.
  const bare = $derived(isPowerUser());

  function toggle() {
    open = !open;
    if (open) {
      window.dispatchEvent(
        new CustomEvent("field-description-open", { detail: id }),
      );
    }
  }

  $effect(() => {
    if (typeof window === "undefined") return;
    function onOtherOpen(e: Event) {
      if ((e as CustomEvent).detail !== id && open) open = false;
    }
    window.addEventListener("field-description-open", onOtherOpen);
    return () =>
      window.removeEventListener("field-description-open", onOtherOpen);
  });

</script>

{#if bare}
  <p {id} class="sr-only">
    {#if typeof description === "string"}
      {description}
    {:else}
      {@render description()}
    {/if}
  </p>
{:else}
  <div
    class={cn(
      "flex gap-2",
      open ? "text-foreground-darker" : "text-foreground-darker/50",
      (icon === "info" || icon === "question") ? "items-start" : "items-baseline",
    )}
  >
    <button
      type="button"
      onclick={toggle}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      aria-expanded={open}
      aria-controls={id}
      aria-label="Toggle description"
      class={cn(
        "md:cursor-default opacity-50 size-6 p-0.5 shrink-0 focus-visible:outline-none focus-visible:bg-secondary transition-opacity duration-300 group-hover:opacity-100 focus-visible:text-background focus-visible:ring-2 focus-visible:ring-secondary flex items-center justify-center rounded-full corner-shape-squircle",
        open ? "opacity-100" : "opacity-50",
      )}
    >
      {#if icon === "bulbs"}
        {#if open}
          <span class="sr-only">Hide description</span>
          <Icon name="bulb-on" class="animate-pop" />
        {:else}
          <Icon name="bulb" />
        {/if}
      {:else}
        <Icon name={icon} />
      {/if}
    </button>
    <p
      {id}
      class={cn(
        "font-sans whitespace-normal transition-opacity duration-300 ease-in-out-quart",
        !open && "md:group-hover:animate-down md:not-group-hover:animate-up",
        open ? "opacity-100 animate-down" : "opacity-0 animate-up",
      )}
    >
      {#if typeof description === "string"}
        {description}
      {:else}
        {@render description()}
      {/if}
    </p>
  </div>
{/if}
