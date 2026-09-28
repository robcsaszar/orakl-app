<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import { toast } from "@/lib/toast.js";

  /**
   * Data export with a projected size (map #840 UI feedback): fetch the export
   * once, show its actual size in a confirmation dialog, and only save the
   * already-fetched blob when the viewer confirms — no second request, no new
   * endpoint.
   */
  let loading = $state(false);
  let open = $state(false);
  let blob = $state<Blob | null>(null);
  let filename = $state("orakl-export.json");
  let sizeLabel = $state("");

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  }

  async function prepare() {
    if (loading) return;
    loading = true;
    try {
      const res = await fetch("/api/profile/export");
      if (!res.ok) {
        toast.error("Could not prepare your export. Try again.");
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      if (match) filename = match[1];
      blob = await res.blob();
      sizeLabel = formatBytes(blob.size);
      open = true;
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      loading = false;
    }
  }

  function close() {
    open = false;
    blob = null;
  }

  function download() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    close();
  }
</script>

<Button variant="secondary" disabled={loading} onclick={prepare}>
  {loading ? "Preparing…" : "Download my data"}
</Button>

<ResponsiveOverlay
  id="export-confirm"
  {open}
  onClose={close}
  ariaLabel="Download your data"
>
  {#snippet title()}Download your data{/snippet}
  <p class="text-foreground-darker font-sans text-sm">
    Your export is about <strong class="text-foreground">{sizeLabel}</strong>, a
    single JSON file ({filename}).
  </p>
  {#snippet footer()}
    <Button variant="ghost" onclick={close}>Cancel</Button>
    <Button variant="secondary" onclick={download}>Download</Button>
  {/snippet}
</ResponsiveOverlay>
