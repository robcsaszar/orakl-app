<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn, tv } from "tailwind-variants";
  import { page } from "$app/state";
  import Icon from "./Icon.svelte";

  export const linkVariants = tv({
    base: "flex items-center gap-2 group transition-colors duration-150 ease-out focus-visible:outline-none disabled:opacity-70 disabled:cursor-not-allowed font-sans cursor-pointer",
    variants: {
      color: { default: "text-foreground-darker" },
      interaction: {
        default: "hover:text-foreground focus-visible:text-foreground active:text-foreground",
        danger: "hover:text-danger focus-visible:text-danger active:text-danger",
      },
      intent: {
        inline: "inline underline decoration-dotted decoration-1 underline-offset-2 bg-none rounded-sm focus-visible:text-violet-100",
        link: "focus-visible:text-background focus-visible:bg-foreground px-1 rounded-xl corner-shape-squircle",
        button: "",
      },
      content: {
        text: "items-center justify-center -mx-1.5 px-1.5 whitespace-nowrap",
        inline: "",
        icon: "",
      },
      unread: {
        true: [
          "relative",
          "after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2",
          "after:size-1 after:rounded-full after:bg-emerald-500",
          "after:animate-dot-down after:opacity-0",
          "after:ring-2 after:ring-emerald-500/25 after:ring-offset-1 after:ring-offset-background",
          "before:content-[''] before:absolute before:-bottom-2 before:left-1/2 before:-translate-x-1/2",
          "before:size-2 before:rounded-full before:bg-emerald-500/50",
          "before:animate-unread-pulse before:opacity-0",
        ],
      },
      current: {
        true: [
          "relative text-foreground",
          "after:content-[''] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2",
          "after:size-1 after:rounded-full after:bg-current",
          "after:animate-dot-down after:opacity-0",
        ],
      },
    },
    defaultVariants: { color: "default", interaction: "default", intent: "link", content: "text" },
  });

  type LinkVariants = VariantProps<typeof linkVariants>;

  let {
    href,
    class: className = "",
    color,
    intent = "link",
    content,
    interaction,
    unread = false,
    showCurrent = true,
    active,
    samePageHint = true,
    children,
    ...props
  }: {
    href?: string;
    class?: string;
    color?: LinkVariants["color"];
    intent?: LinkVariants["intent"];
    content?: LinkVariants["content"];
    interaction?: LinkVariants["interaction"];
    unread?: boolean;
    showCurrent?: boolean;
    active?: boolean;
    /** Show the "You're already here." flourish when clicking the current URL. */
    samePageHint?: boolean;
    children?: Snippet;
  } & HTMLAnchorAttributes = $props();

  const current = $derived(
    active !== undefined
      ? active
      : showCurrent && href != null && href !== "#" && page.url.pathname === href
  );

  // A link to another site (not an in-app path or mailto/anchor): it opens in a
  // new tab and, when inline, carries a diagonal arrow instead of the chevron.
  const isExternal = $derived(
    href != null && (href.startsWith("http://") || href.startsWith("https://"))
  );

  const cls = $derived(
    cn(linkVariants({ color, intent, content, interaction, unread, current, class: className }))
  );

  let samePageActive = $state(false);
  let samePageTimer: ReturnType<typeof setTimeout> | undefined;

  function handleSamePage(e: MouseEvent) {
    // Compare the full URL (path + query), not just the path — otherwise links
    // that differ only by query string (e.g. tab filters) are wrongly treated
    // as the current page and blocked.
    if (samePageHint && href === page.url.pathname + page.url.search) {
      e.preventDefault();
      samePageActive = true;
      clearTimeout(samePageTimer);
      samePageTimer = setTimeout(() => { samePageActive = false; }, 2000);
    }
  }
</script>

<a
  {href}
  class={cls}
  onclick={handleSamePage}
  target={isExternal ? "_blank" : undefined}
  rel={isExternal ? "noopener noreferrer" : undefined}
  {...props}
>
  {#if samePageActive}
    You're already here.
  {:else}
    {@render children?.()}
    {#if intent === "inline"}
      {#if isExternal}
        <Icon name="arrow-up-right" class="ml-0.5 inline size-3.5 align-baseline" />
      {:else}
        <Icon name="chevron-right-angle" class="ease-ease-in-out-quart inline -translate-x-1 justify-baseline duration-200 group-hover:translate-x-0 group-focus-visible:translate-x-0" />
      {/if}
    {/if}
  {/if}
</a>
