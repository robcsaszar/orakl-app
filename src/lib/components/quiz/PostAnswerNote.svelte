<script lang="ts">
  import Card from "$lib/components/ui/Card.svelte";
  import { renderNoteHtml } from "@/lib/note-format.js";

  interface Props {
    note: string;
    /** "display" renders at the large display-mode text scale used when QuizDisplay is in display mode. */
    variant?: "default" | "display";
  }

  let { note, variant = "default" }: Props = $props();
  const html = $derived(renderNoteHtml(note));
</script>

<Card variant="ground" padding="sm">
  <p
    class={variant === "display"
      ? "break-words text-pretty text-2xl lg:text-3xl"
      : "break-words text-pretty text-sm"}
  >{@html html}</p>
</Card>

<style>
  p :global(strong) {
    font-weight: 600;
  }
</style>
