<script lang="ts">
  import { type EmotePack, MAX_EMOTE_SET } from "@orakl/protocol";
  import EmotePicker from "$lib/components/quiz-setup/EmotePicker.svelte";
  import { invalidateAll } from "$app/navigation";
  import { toast } from "@/lib/toast.js";

  let { packs, savedIds }: { packs: EmotePack[]; savedIds: string[] } = $props();

  // Writable derived: toggling edits locally; resets to server truth when the
  // prop refreshes. Only live ids: a retired one has no toggle to remove it,
  // and a save carrying it would be refused.
  let selected = $derived.by(() => {
    const live = new Set(packs.flatMap((p) => p.emotes.map((e) => e.id)));
    return savedIds.filter((id) => live.has(id));
  });

  // Saves run one at a time, in toggle order, so the last toggle wins.
  let queue: Promise<void> = Promise.resolve();

  function toggle(emoteId: string) {
    if (selected.includes(emoteId)) selected = selected.filter((id) => id !== emoteId);
    else if (selected.length < MAX_EMOTE_SET) selected = [...selected, emoteId];
    else return;
    const emotes = selected;
    queue = queue.then(() => save(emotes));
  }

  async function save(emotes: string[]) {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotes }),
      });
      if (res.ok) return;
      const body = await res.json().catch(() => ({}));
      toast.error((body as { error?: string })?.error ?? "Could not save emotes.");
    } catch {
      toast.error("Could not save emotes.");
    }
    // Re-read the saved set so the picker shows the server's truth.
    await invalidateAll();
  }
</script>

<EmotePicker {packs} {selected} onToggle={toggle} />
