<script module lang="ts">
  // Module-level export (Svelte 5): the id CuratorToolboxFab's click dispatches
  // `drawer:open` against, and CuratorToolboxDrawer's <Drawer id={...}> reads.
  export const CURATOR_TOOLBOX_DRAWER_ID = "curator-toolbox-drawer";
</script>

<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";

  let { pendingCount = 0 }: { pendingCount?: number } = $props();

  function open() {
    window.dispatchEvent(
      new CustomEvent("drawer:open", {
        detail: { id: CURATOR_TOOLBOX_DRAWER_ID },
      }),
    );
  }
</script>

<!-- Sub-breakpoint only: at lg+ the toolbox is the rail in the (game) layout. -->
<div class="fixed bottom-6 right-6 lg:hidden">
  <Button
    onclick={open}
    variant="primary"
    intent="icon"
    class="relative size-14 shadow-lg"
    aria-label={pendingCount > 0
      ? `Curator toolbox, ${pendingCount} pending`
      : "Curator toolbox"}
  >
    <Icon name="scroll" class="size-6" />
    {#if pendingCount > 0}
      <Badge variant="count-active" class="absolute -top-1 -right-1">
        {pendingCount}
      </Badge>
    {/if}
  </Button>
</div>
