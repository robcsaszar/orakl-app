<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import { toast } from "@/lib/toast";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Seeded from load; writable so the field follows typing until saved.
  let freeHostGames = $derived(String(data.freeHostGames));
  let saving = $state(false);

  async function save() {
    const raw = String(freeHostGames ?? "").trim();
    const parsed = raw === "" ? Number.NaN : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      toast.error("Enter a whole number of 0 or more.");
      return;
    }
    saving = true;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ freeHostGames: parsed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? "Could not save the allowance.");
        return;
      }
      const saved = (await res.json()) as { freeHostGames: number };
      freeHostGames = String(saved.freeHostGames);
      toast.success("Hosting allowance saved.");
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      saving = false;
    }
  }
</script>

<Metatags title="Settings" description="App-wide settings an admin edits live." />

<div class="flex flex-col gap-8 py-8">
  <header class="flex flex-col gap-2">
    <h1 class="text-lg font-semibold">Settings</h1>
    <p class="text-foreground-darker font-sans max-w-prose">
      App-wide values an admin edits live. Members see a change within five
      minutes.
    </p>
  </header>

  <Card variant="default" class="gap-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-base font-semibold">Hosting allowance</h2>
      <p class="text-foreground-darker font-sans text-sm max-w-prose">
        Free games a verified member may host each calendar year. Reaches
        members within five minutes.
      </p>
    </div>
    <Input
      id="free-host-games"
      name="freeHostGames"
      label="Free games per year"
      type="number"
      min="0"
      step="1"
      bind:value={freeHostGames}
    />
    <div>
      <Button
        variant={saving ? "disabled" : "primary"}
        loading={saving}
        onclick={save}
      >
        Save
      </Button>
    </div>
  </Card>
</div>
