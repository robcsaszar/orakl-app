<script lang="ts">
import { percent } from "@orakl/shared";
  import { onDestroy, tick } from "svelte";
  import { cn } from "tailwind-variants";
  import type { Snippet } from "svelte";
  
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import { buttonVariants } from "@/lib/button-variants.js";

  interface Props {
    label: string;
    /** Accessible name before the confirm step; defaults to `label`. */
    ariaLabel?: string;
    confirmLabel?: string;
    confirmAriaLabel?: string;
    icon: Snippet;
    confirmIcon?: Snippet;
    iconPosition?: "left" | "right";
    onConfirm?: () => void;
    formAction?: string;
    /** Confirm-state colour and ring: danger/success tint, or neutral — the button's own colour, `border-current` ring. */
    confirmVariant?: "danger" | "success" | "neutral";
    variant?: "outline" | "secondary" | "danger" | "primary";
    duration?: number;
    revealDelay?: number;
    infinite?: boolean;
    progressStyle?: "bar" | "border";
    class?: string;
  }

  let {
    label,
    ariaLabel,
    confirmLabel = "Are you sure?",
    confirmAriaLabel = "Click again to confirm",
    icon,
    confirmIcon,
    iconPosition = "right",
    onConfirm,
    formAction,
    confirmVariant = "danger",
    variant,
    duration = 10_000,
    revealDelay = 1_000,
    infinite = false,
    progressStyle = "bar",
    class: className,
  }: Props = $props();

  const VISIBLE_DURATION = $derived(duration - revealDelay);

  let showConfirm = $state(false);
  let barVisible = $state(false);
  let progressPct = $state(100);
  let barEl = $state<HTMLDivElement | undefined>(undefined);
  let borderEl = $state<HTMLDivElement | undefined>(undefined);
  let formEl = $state<HTMLFormElement | undefined>(undefined);

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let delayTimeout: ReturnType<typeof setTimeout> | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let widthAnim: Animation | null = null;
  let opacityAnimIn: Animation | null = null;
  let opacityAnimOut: Animation | null = null;
  let downAnim: Animation | null = null;
  let rafId: number | null = null;

  function cancelAnims() {
    widthAnim?.cancel(); widthAnim = null;
    opacityAnimIn?.cancel(); opacityAnimIn = null;
    opacityAnimOut?.cancel(); opacityAnimOut = null;
    downAnim?.cancel(); downAnim = null;
    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function startBorderRAF(visibleDuration: number) {
    if (rafId) cancelAnimationFrame(rafId);
    const start = performance.now();
    function frame(now: number) {
      const p = Math.max(0, 1 - (now - start) / visibleDuration);
      if (borderEl) borderEl.style.setProperty("--pct", `${p * 100}%`);
      progressPct = percent(p);
      if (p > 0) {
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = null;
        barVisible = false;
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  async function startProgress() {
    barVisible = false;
    progressPct = 100;
    cancelAnims();
    if (delayTimeout) clearTimeout(delayTimeout);

    if (infinite) {
      delayTimeout = setTimeout(async () => {
        barVisible = true;
        delayTimeout = null;
      }, revealDelay);
      return;
    }

    delayTimeout = setTimeout(async () => {
      barVisible = true;
      delayTimeout = null;
      await tick();

      if (progressStyle === "border") {
        if (!borderEl) return;
        borderEl.style.setProperty("--pct", "100%");
        opacityAnimIn = borderEl.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 200,
          easing: "ease-out",
          fill: "forwards",
        });
        startBorderRAF(VISIBLE_DURATION);
        return;
      }

      if (!barEl) return;
      startBorderRAF(VISIBLE_DURATION); // keeps aria-valuenow in step with the bar
      widthAnim = barEl.animate([{ scale: "1 1" }, { scale: "0 1" }], {
        duration: VISIBLE_DURATION,
        easing: "cubic-bezier(0.65,0.05,0.36,1)",
        fill: "forwards",
      });
      opacityAnimIn = barEl.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 300,
        delay: revealDelay,
        easing: "cubic-bezier(0.65,0.05,0.36,1)",
        fill: "forwards",
      });
      opacityAnimOut = barEl.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: revealDelay * 3,
        delay: Math.max(0, VISIBLE_DURATION - revealDelay * 3),
        easing: "cubic-bezier(0.45,0.05,0.55,1)",
        fill: "forwards",
      });
      downAnim = barEl.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(4px)" }],
        {
          duration: revealDelay / 2,
          delay: revealDelay,
          easing: "cubic-bezier(0.45,0.05,0.55,1)",
          fill: "forwards",
        },
      );
      widthAnim.onfinish = () => { barVisible = false; };
    }, revealDelay);
  }

  function stopProgress() {
    cancelAnims();
    if (delayTimeout) { clearTimeout(delayTimeout); delayTimeout = null; }
    barVisible = false;
  }

  function cancel() {
    showConfirm = false;
    stopProgress();
    if (timeout) { clearTimeout(timeout); timeout = null; }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && showConfirm) cancel();
  }

  function handleClick() {
    if (!showConfirm) {
      showConfirm = true;
      startProgress();
      if (!infinite) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          showConfirm = false;
          timeout = null;
          stopProgress();
        }, duration);
      }
      window.addEventListener("keydown", handleKeyDown);
      return;
    }
    window.removeEventListener("keydown", handleKeyDown);
    showConfirm = false;
    stopProgress();
    if (timeout) { clearTimeout(timeout); timeout = null; }
    onConfirm?.();
    if (formEl) formEl.requestSubmit();
  }

  onDestroy(() => {
    if (timeout) clearTimeout(timeout);
    stopProgress();
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", handleKeyDown);
    }
  });

  const confirmColors = {
    danger: "text-danger-lighter",
    success: "text-success-lighter",
    neutral: "",
  } as const;

  const hoverColors = {
    danger: "hover:text-danger-lighter focus-visible:text-danger-lighter",
    success: "hover:text-success-lighter focus-visible:text-success-lighter",
    neutral: "focus-visible:text-background",
  } as const;

  const borderColors = {
    danger: "border-danger",
    success: "border-success",
    neutral: "border-current",
  } as const;
</script>

{#snippet btn()}
  <Button
    unstyled
    type="button"
    onclick={handleClick}
    aria-label={showConfirm ? confirmAriaLabel : (ariaLabel ?? label)}
    class={cn(
      "relative flex items-center group transition-colors duration-300 focus-visible:outline-none font-sans cursor-pointer focus-visible:bg-foreground rounded-xl corner-shape-squircle justify-center whitespace-nowrap gap-2 after:hidden",
      variant ? buttonVariants({ variant, intent: "button", radius: "squircle" }) : "-mx-1.5 px-1.5",
      hoverColors[confirmVariant],
      variant ? "" : "text-foreground-darker",
      className,
      showConfirm ? confirmColors[confirmVariant] : "",
    )}
  >
    {@render buttonContents()}
  </Button>
{/snippet}

{#if formAction}
  <form method="POST" action={formAction} class="contents" bind:this={formEl}>
    {@render btn()}
  </form>
{:else}
  {@render btn()}
{/if}

{#snippet buttonContents()}
  <!-- Progress indicator -->
  {#if showConfirm && barVisible}
    {#if progressStyle === "border"}
      <!-- Sweeping border: conic-gradient mask depletes clockwise from top -->
      <div
        bind:this={borderEl}
        aria-hidden="true"
        class={cn(
          "pointer-events-none absolute rounded-3xl corner-shape-squircle border-2 opacity-0",
          borderColors[confirmVariant],
        )}
        style="inset: -6px; --pct: 100%; mask: conic-gradient(from 0deg, black 0%, black var(--pct, 100%), transparent var(--pct, 100%)); -webkit-mask: conic-gradient(from 0deg, black 0%, black var(--pct, 100%), transparent var(--pct, 100%));"
      ></div>
    {:else}
      <!-- Shrinking bar -->
      <div
        bind:this={barEl}
        class={cn(
          "absolute bottom-0 left-0 h-0.5 w-full origin-left rounded-full",
          infinite ? "w-full opacity-40 animate-pulse bg-current" : "bg-current opacity-0",
        )}
        role={infinite ? undefined : "progressbar"}
        aria-label="Time remaining to confirm"
        aria-busy={infinite || undefined}
        aria-valuemin={infinite ? undefined : 0}
        aria-valuemax={infinite ? undefined : 100}
        aria-valuenow={infinite ? undefined : progressPct}
      >
        {#if infinite}
          <!-- Hourglass overlay -->
          <div class="absolute left-1/2 -translate-x-1/2 -top-3.5 pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 384 512"
              fill="currentColor"
              class="size-3 drop-shadow-[0_0_3px_currentColor]"
              aria-hidden="true"
            >
              <path d="M32 0C14.3 0 0 14.3 0 32S14.3 64 32 64l0 11c0 42.4 16.9 83.1 46.9 113.1L146.7 256 78.9 323.9C48.9 353.9 32 394.6 32 437l0 11c-17.7 0-32 14.3-32 32s14.3 32 32 32l32 0 256 0 32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l0-11c0-42.4-16.9-83.1-46.9-113.1L237.3 256l67.9-67.9c30-30 46.9-70.7 46.9-113.1l0-11c17.7 0 32-14.3 32-32S369.7 0 352 0L32 0zM96 75l0-11 192 0 0 11c0 25.5-10.1 49.9-28.1 67.9L192 215.8l-67.9-67.9C106.1 124.9 96 100.4 96 75z"/>
            </svg>
          </div>
        {/if}
      </div>
    {/if}
  {/if}

  <!-- Icon left -->
  {#if iconPosition === "left"}
    {#if showConfirm}
      {#if confirmIcon}{@render confirmIcon()}{:else}{@render defaultConfirmIcon()}{/if}
    {:else}
      {@render icon()}
    {/if}
  {/if}

  {#if confirmLabel || label}
     <span class="text-inherit">{showConfirm ? confirmLabel : label}</span>
  {/if}

  <!-- Icon right -->
  {#if iconPosition === "right"}
    {#if showConfirm}
      {#if confirmIcon}{@render confirmIcon()}{:else}{@render defaultConfirmIcon()}{/if}
    {:else}
      {@render icon()}
    {/if}
  {/if}
{/snippet}

{#snippet defaultConfirmIcon()}
  <Icon name="hourglass" />
{/snippet}
