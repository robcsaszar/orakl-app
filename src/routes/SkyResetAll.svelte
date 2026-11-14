<!--
  "Reset all" for the tab that is open: at the end of the tab row, the same
  on every tab. It always holds its place; it is dim and does nothing while
  the tab has nothing changed.
-->
<script lang="ts">
  import ConfirmButton from "@/lib/components/ui/ConfirmButton.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import { hinted } from "./sky-panel.svelte";

  let {
    what,
    changed,
    onReset,
  }: {
    /** What the tab holds, for the question and the hint: "the field settings"; empty for a tab with no settings. */
    what: string;
    /** Whether anything on the tab differs from what it resets to. */
    changed: boolean;
    onReset: () => void;
  } = $props();
</script>

<span
  class="flex transition-opacity duration-150 motion-reduce:transition-none {changed ? '' : 'pointer-events-none opacity-40'}"
  inert={!changed}
  use:hinted={what ? `Resets every setting on this tab: ${what}. The other tabs stay as they are.` : "This tab has no settings to reset."}
>
  <ConfirmButton label="Reset all" confirmLabel="Reset this tab?" confirmVariant="danger" iconPosition="left" revealDelay={0} duration={4000} onConfirm={onReset} class="gap-1.5 rounded-lg px-2 py-2 font-mono text-xs font-normal">
    {#snippet icon()}<Icon name="reset" size="xs" />{/snippet}
    {#snippet confirmIcon()}<Icon name="confirm" size="xs" />{/snippet}
  </ConfirmButton>
</span>
