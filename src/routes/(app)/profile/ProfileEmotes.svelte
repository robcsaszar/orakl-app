<script lang="ts">
  import { type EmotePack, MAX_EMOTE_SET } from "@orakl/protocol";
  import EmotePicker from "$lib/components/quiz-setup/EmotePicker.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { toast } from "@/lib/toast.js";

  let { packs, savedIds }: { packs: EmotePack[]; savedIds: string[] } = $props();

  // Writable derived: toggling edits locally; resets to server truth when the
  // prop refreshes. Only live ids: a retired one has no toggle to remove it,
  // and a save carrying it would be refused.
  let selected = $derived.by(() => {
    const live = new Set(packs.flatMap((p) => p.emotes.map((e) => e.id)));
    return savedIds.filter((id) => live.has(id));
  });
  let saving = $state(false);
  const unchanged = $derived(
    selected.length === savedIds.length && selected.every((id, i) => id === savedIds[i]),
  );

  function toggle(emoteId: string) {
    if (selected.includes(emoteId)) selected = selected.filter((id) => id !== emoteId);
    else if (selected.length < MAX_EMOTE_SET) selected = [...selected, emoteId];
  }

  async function save() {
    saving = true;
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotes: selected }),
      });
      if (res.ok) {
        toast.success("Emotes saved.");
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error((body as { error?: string })?.error ?? "Could not save emotes.");
      }
    } catch {
      toast.error("Could not save emotes.");
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex flex-col gap-4 items-start">
  <EmotePicker {packs} {selected} onToggle={toggle} />
  <Button type="button" variant="outline" disabled={saving || unchanged} onclick={save}>Save emotes</Button>
</div>
