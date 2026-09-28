<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import { anchorFor } from "@/lib/legal/ledger.js";
  import { toast } from "@/lib/toast.js";
  import { formatDateTimeLocal } from "@/lib/format.js";

  let { data }: { data: PageData } = $props();

  const otherCount = $derived(data.sessions.filter((s) => !s.current).length);

  // Bulk actions confirm in a dialog that spells out the outcome.
  let othersOpen = $state(false);
  let everywhereOpen = $state(false);
  let locationOnOpen = $state(false);

  /** Coarse "last active" — last_seen is the sign-in time until throttled
   *  updates land (#824, decision #11). */
  function relativeTime(epochSec: number): string {
    const diff = Math.max(0, Math.floor(Date.now() / 1000) - epochSec);
    if (diff < 60) return "just now";
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  /** Exact sign-in time for the info tooltip — the reliable way to tell two
   *  same-labelled devices apart. */
  function signedInAt(epochSec: number): string {
    return formatDateTimeLocal(epochSec * 1000);
  }

  /** DELETE the endpoint; `endsCurrent` sessions return the caller to login,
   *  others refresh the list in place. */
  async function doRevoke(url: string, endsCurrent: boolean) {
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(
          (d as { error?: string }).error ?? "Could not sign out. Try again.",
        );
        return;
      }
      if (endsCurrent) {
        await goto("/login");
        return;
      }
      toast.success("Signed out.");
      await invalidateAll();
    } catch {
      toast.error("Network error. Try again.");
    }
  }

  const revokeOne = (sid: string, isCurrent: boolean) =>
    doRevoke(`/api/profile/sessions/${encodeURIComponent(sid)}`, isCurrent);
  const revokeOthers = () =>
    doRevoke("/api/profile/sessions?scope=others", false);
  const revokeAll = () => doRevoke("/api/profile/sessions", true);

  /** Sign-in locations opt-in (decision #9). Turning on signs out everywhere
   *  so the label is fixed at the next sign-in; turning off keeps this device
   *  and erases every label and audit IP at once. */
  async function setLocationOptIn(enabled: boolean) {
    try {
      const res = await fetch("/api/profile/location-opt-in", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(
          (d as { error?: string }).error ?? "Could not save. Try again.",
        );
        return;
      }
      if (enabled) {
        await goto("/login");
        return;
      }
      toast.success("Sign-in locations turned off.");
      await invalidateAll();
    } catch {
      toast.error("Network error. Try again.");
    }
  }
</script>

<Metatags
  title="Active sessions"
  description="Devices signed in to your account."
/>

<Card variant="ground">
  <div class="flex flex-col gap-2">
    <h1 class="text-lg font-semibold">Active sessions</h1>
    <p class="text-foreground-darker font-sans text-sm">
      Every device signed in to your account. Sign out any you don't recognise.
    </p>
  </div>

  {#if data.sessions.length === 0}
    <p class="text-foreground-darker font-sans text-sm">
      No active sessions on record.
    </p>
  {:else}
    <ul class="flex flex-col gap-3 w-full">
      {#each data.sessions as session (session.sid)}
        <li>
          <Card
            variant={session.current ? "highlighted" : "default"}
            class="relative"
          >
            {#if session.current}
              <!-- Rests on the top border, ~8px from the right edge. -->
              <Badge variant="primary" class="absolute -top-2.5 right-2"
                >This device</Badge
              >
            {/if}
            <div class="flex gap-3 items-start justify-between">
              <div class="flex flex-col gap-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold truncate">{session.label}</span>
                  <Button
                    unstyled
                    type="button"
                    aria-label="Session details"
                    data-tooltip={`Signed in ${signedInAt(session.createdAt)} · ID ${session.fingerprint}`}
                    data-tooltip-position="top"
                    class="shrink-0 text-foreground-darker transition-colors hover:text-foreground focus-visible:text-foreground cursor-help"
                  >
                    <Icon name="info" class="size-4" />
                  </Button>
                </div>
                {#if session.location}
                  <span class="text-foreground-darker text-sm font-sans"
                    >{session.location}</span
                  >
                {/if}
                <span class="text-foreground-darker text-sm font-sans">
                  Last active {relativeTime(session.lastSeen)}
                </span>
              </div>
              <!-- Confirm in place ("Are you sure?"), mirroring the header
                   sign-out; muted at rest (distinct from the solid-red bulk
                   buttons), no icon. -->
              <div class="shrink-0">
                <ConfirmButton
                  label="Sign out"
                  confirmLabel="Are you sure?"
                  confirmAriaLabel="Click again to confirm sign out"
                  onConfirm={() => revokeOne(session.sid, session.current)}
                >
                  {#snippet icon()}{/snippet}
                  {#snippet confirmIcon()}{/snippet}
                </ConfirmButton>
              </div>
            </div>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</Card>

<!-- Sign-in locations opt-in (decision #9): the one place an account lets an
     IP-derived value exist for it. -->
<Card variant="ground">
  <div class="flex flex-col gap-2">
    <h2 class="text-lg font-semibold">
      Would you like to see your sign-in locations?
    </h2>
    <p class="text-foreground-darker font-sans text-sm">
      When this is on, each sign-in is labelled with its city so you can
      recognise your devices. Your IP address is used for the lookup at
      sign-in and kept in the security log for 90 days. When it is off, no IP
      address is stored. Details are in the
      <Link
        href={`/legal/privacy#${anchorFor("location")}`}
        intent="inline"
        class="inline"
        >privacy policy</Link
      >.
    </p>
  </div>
  {#if data.locationOptIn.enabled}
    <p class="text-foreground-darker/70 font-sans text-xs">
      Locations are resolved from an offline database at sign-in. This product
      includes GeoLite2 data created by MaxMind, available from
      <Link href="https://www.maxmind.com" intent="inline" class="inline"
        >maxmind.com</Link
      >.
    </p>
    <ConfirmButton
      label="Turn off sign-in locations"
      confirmLabel="Turn off sign-in locations?"
      confirmAriaLabel="Click again to confirm turning off sign-in locations"
      onConfirm={() => setLocationOptIn(false)}
    >
      {#snippet icon()}{/snippet}
      {#snippet confirmIcon()}{/snippet}
    </ConfirmButton>
  {:else}
    <Button variant="secondary" onclick={() => (locationOnOpen = true)}
      >Turn on sign-in locations</Button
    >
  {/if}
</Card>

<Dialog.Root bind:open={locationOnOpen} labelled>
  <Dialog.Content>
    <Dialog.Title>Turn on sign-in locations?</Dialog.Title>
    <p class="px-5 py-4 text-sm text-foreground-darker font-sans">
      You'll be signed out everywhere and can sign in again. From then on each
      sign-in is labelled with its city. You can turn this off at any time.
    </p>
    <Dialog.Footer class="flex justify-end gap-3">
      <Button variant="ghost" onclick={() => (locationOnOpen = false)}
        >Cancel</Button
      >
      <Button
        onclick={() => {
          locationOnOpen = false;
          setLocationOptIn(true);
        }}>Turn on</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- One card for the bulk actions; only when there's more than this device. -->
{#if otherCount > 0}
  <Card variant="danger">
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Sign out multiple devices</h2>
      <p class="text-foreground-darker font-sans text-sm">
        Sign out your other devices and keep this one, or sign out everywhere
        and return to the login screen.
      </p>
    </div>
    <div class="flex flex-wrap gap-3 items-center">
      <Button variant="danger" onclick={() => (othersOpen = true)}
        >Sign out other devices</Button
      >
      <Button variant="danger" onclick={() => (everywhereOpen = true)}
        >Sign out everywhere</Button
      >
    </div>
  </Card>
{/if}

<Dialog.Root bind:open={othersOpen} labelled>
  <Dialog.Content>
    <Dialog.Title>Sign out other devices?</Dialog.Title>
    <p class="px-5 py-4 text-sm text-foreground-darker font-sans">
      Every device except this one will be signed out and has to sign in again.
      This device stays signed in.
    </p>
    <Dialog.Footer class="flex justify-end gap-3">
      <Button variant="ghost" onclick={() => (othersOpen = false)}>Cancel</Button
      >
      <Button
        variant="danger"
        onclick={() => {
          othersOpen = false;
          revokeOthers();
        }}>Sign out other devices</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={everywhereOpen} labelled>
  <Dialog.Content>
    <Dialog.Title>Sign out everywhere?</Dialog.Title>
    <p class="px-5 py-4 text-sm text-foreground-darker font-sans">
      All devices will be signed out, including this one. You'll be returned to
      the login screen and can sign in again.
    </p>
    <Dialog.Footer class="flex justify-end gap-3">
      <Button variant="ghost" onclick={() => (everywhereOpen = false)}
        >Cancel</Button
      >
      <Button
        variant="danger"
        onclick={() => {
          everywhereOpen = false;
          revokeAll();
        }}>Sign out everywhere</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
