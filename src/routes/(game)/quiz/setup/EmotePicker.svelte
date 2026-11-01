<script lang="ts">
  import { type EmotePack, MAX_EMOTE_SET } from "@orakl/protocol";
  import Button from "$lib/components/ui/Button.svelte";
  import FieldDescription from "$lib/components/ui/partials/FieldDescription.svelte";

  /**
   * Plain picker for the Player's emote set: every gallery emote as a toggle,
   * at most five chosen, kept in the order picked. An empty set plays with the
   * default pack's first five.
   */
  let {
    packs,
    selected,
    onToggle,
  }: {
    packs: EmotePack[];
    selected: string[];
    onToggle: (emoteId: string) => void;
  } = $props();

  const full = $derived(selected.length >= MAX_EMOTE_SET);
</script>

<fieldset class="flex flex-col gap-2 items-start">
  <legend class="text-lg">Emotes</legend>
  <p class="text-sm text-foreground-darker" aria-live="polite">
    {selected.length} of {MAX_EMOTE_SET} chosen
  </p>
  {#each packs as pack (pack.id)}
    <div class="flex flex-col gap-1">
      {#if packs.length > 1}<span class="text-sm font-semibold">{pack.title}</span>{/if}
      <div class="flex flex-wrap gap-1">
        {#each pack.emotes as emote (emote.id)}
          {@const chosen = selected.includes(emote.id)}
          <Button
            type="button"
            unstyled
            class="rounded-md border-2 p-1 transition-colors disabled:opacity-40 {chosen
              ? 'border-secondary bg-secondary/20'
              : 'border-transparent hover:border-secondary/40'}"
            aria-pressed={chosen}
            aria-label={emote.title}
            title={emote.title}
            disabled={!chosen && full}
            onclick={() => onToggle(emote.id)}
          >
            <img src={emote.src} alt="" width="32" height="32" draggable="false" />
          </Button>
        {/each}
      </div>
    </div>
  {/each}
  <FieldDescription
    description="Choose up to five emotes to react with during play, in the order you pick them. Choose none to use the default five."
    id="emotes-description"
  />
</fieldset>
