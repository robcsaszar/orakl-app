<script lang="ts">
  import type { Snippet } from "svelte";
  import ResponsiveOverlay from "./ResponsiveOverlay.svelte";

  let {
    id,
    title,
    footer,
    children,
  }: {
    id: string;
    title?: string | Snippet;
    footer?: Snippet;
    children?: Snippet;
  } = $props();

  let open = $state(false);

  $effect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent).detail?.id === id) open = true;
    };
    const onClose = (e: Event) => {
      if ((e as CustomEvent).detail?.id === id) open = false;
    };
    window.addEventListener("drawer:open", onOpen);
    window.addEventListener("drawer:close", onClose);
    return () => {
      window.removeEventListener("drawer:open", onOpen);
      window.removeEventListener("drawer:close", onClose);
    };
  });
</script>

{#snippet titleText()}{title}{/snippet}

<!-- A bottom sheet on every viewport, opened by `drawer:open` window events. -->
<ResponsiveOverlay
  {id}
  {open}
  mode="drawer"
  title={typeof title === "string" ? titleText : title}
  {footer}
  onClose={() => (open = false)}
>
  {@render children?.()}
</ResponsiveOverlay>
