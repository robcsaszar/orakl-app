<script lang="ts">
  import Card from "$lib/components/ui/Card.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { toast } from "$lib/toast.js";

  let opening = $state(false);

  async function openPortal() {
    opening = true;
    try {
      const res = await fetch("/api/profile/billing/portal", {
        method: "POST",
      });
      if (res.ok) {
        const d = (await res.json()) as { url: string };
        window.location.href = d.url;
        return;
      }
      const d = await res.json().catch(() => ({}));
      toast.error((d as { error?: string }).error ?? "Failed to open portal");
    } catch {
      toast.error("Network error");
    } finally {
      opening = false;
    }
  }
</script>

<Card variant="danger">
  <div class="flex flex-col gap-4 items-start" role="alert">
    <p class="text-sm font-sans">
      Your last payment failed. Update your payment method to keep hosting.
    </p>
    <Button onclick={openPortal} disabled={opening} variant="danger">
      {opening ? "Redirecting…" : "Fix payment"}
    </Button>
  </div>
</Card>
