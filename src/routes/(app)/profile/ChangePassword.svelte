<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import { toast } from "@/lib/toast.js";

  let pwCurrent = $state("");
  let pwNew = $state("");
  let pwSaving = $state(false);
  let pwError = $state("");

  async function changePassword() {
    pwSaving = true;
    pwError = "";
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNew,
        }),
      });
      if (res.ok) {
        toast.success("Password updated.");
        pwCurrent = "";
        pwNew = "";
      } else {
        const d = await res.json().catch(() => ({}));
        pwError =
          (d as { error?: string }).error ?? "Failed to change password";
        toast.error(pwError);
      }
    } catch {
      pwError = "Network error";
      toast.error(pwError);
    } finally {
      pwSaving = false;
    }
  }
</script>

<Card variant="ground">
  <h2 class="text-lg font-semibold">Change password</h2>
  <div class="flex flex-col gap-3 w-full items-start">
    <Input
      id="pw-current"
      name="currentPassword"
      label="Current password"
      placeholder="e.g. myOldPassword123%"
      type="password"
      autocomplete="current-password"
      class="self-stretch field-sizing-content md:min-w-md"
      bind:value={pwCurrent}
      disabled={pwSaving}
    />
    <Input
      id="pw-new"
      name="newPassword"
      label="New password"
      placeholder="e.g. myNewPassword123%"
      type="password"
      autocomplete="new-password"
      class="self-stretch field-sizing-content md:min-w-md"
      bind:value={pwNew}
      disabled={pwSaving}
      showStrength
    />
    <Button
      onclick={changePassword}
      disabled={pwSaving || !pwCurrent || pwNew.length < 8}
      >Update password</Button
    >
  </div>
</Card>
