<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import { toast } from "@/lib/toast.js";

  let deleteConfirm = $state(false);
  let deleting = $state(false);
  let deleteError = $state("");

  async function deleteAccount() {
    deleting = true;
    deleteError = "";
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        const d = await res.json().catch(() => ({}));
        deleteError =
          (d as { error?: string }).error ?? "Failed to delete account";
        toast.error(deleteError);
        deleting = false;
      }
    } catch {
      deleteError = "Network error";
      toast.error(deleteError);
      deleting = false;
    }
  }
</script>

<Card variant="danger">
  <h2 class="text-lg font-semibold">Delete account</h2>
  <p class="text-foreground-darker font-sans text-sm">
    Permanently removes your account, its devices and your private custom
    questions; a question promoted into the shared bank stays, with your
    name removed.
    Your name is removed from past results, which stay as anonymised history.
  </p>
  {#if !deleteConfirm}
    <Button
      variant="danger"
      onclick={() => {
        deleteConfirm = true;
      }}>Delete my account</Button
    >
  {:else}
    <p class="text-sm font-medium">This cannot be undone. Are you sure?</p>
    <div class="flex gap-3">
      <Button variant="danger" onclick={deleteAccount} disabled={deleting}
        >Yes, delete</Button
      >
      <Button
        variant="ghost"
        onclick={() => {
          deleteConfirm = false;
        }}
        disabled={deleting}>Cancel</Button
      >
    </div>
  {/if}
</Card>
