<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import Card from "$lib/components/ui/Card.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import { toast } from "$lib/toast";

  const count = $derived(
    Object.keys(page.data.iconDrafts ?? {}).length +
      (page.data.iconScaleDraft ? 1 : 0),
  );

  /** True while Save all or Discard runs; both controls stay disabled. */
  let busy = $state(false);

  async function save() {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch("/api/admin/icons/save", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Could not open the icon PR.");
        return;
      }
      toast.success(`Icon PR opened: ${body.url}`);
      if (body.warning) toast.warning(body.warning);
      await invalidateAll();
    } finally {
      busy = false;
    }
  }

  async function discard() {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch("/api/admin/icons/drafts", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not discard the drafts.");
        return;
      }
      await invalidateAll();
    } finally {
      busy = false;
    }
  }
</script>

{#if count > 0}
  <Card
    variant="mezzanine"
    padding="sm"
    role="region"
    aria-label="Icon drafts"
    class="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 mx-auto w-fit max-w-[calc(100%-1rem)] flex-row flex-nowrap items-center gap-2 rounded-2xl px-3 py-1 text-sm whitespace-nowrap"
  >
    <span>{count} {count === 1 ? "draft" : "drafts"}</span>
    <fieldset disabled={busy} class="contents">
      <span data-tooltip="Save all" class="inline-flex">
        <ConfirmButton
          label=""
          ariaLabel="Save all"
          confirmLabel="Open the icon PR?"
          variant="secondary"
          onConfirm={save}
        >
          {#snippet icon()}<Icon name="upload" size="sm" usage="ui.icon-draft-save" />{/snippet}
          {#snippet confirmIcon()}{/snippet}
        </ConfirmButton>
      </span>
      <span data-tooltip="Discard" class="inline-flex">
        <ConfirmButton
          label=""
          ariaLabel="Discard"
          confirmLabel="Discard all drafts?"
          variant="outline"
          confirmVariant="danger"
          onConfirm={discard}
        >
          {#snippet icon()}<Icon name="delete" size="sm" usage="ui.icon-draft-discard" />{/snippet}
          {#snippet confirmIcon()}{/snippet}
        </ConfirmButton>
      </span>
    </fieldset>
    {#if page.url.pathname !== "/admin/icons"}
      <span data-tooltip="Open admin" class="inline-flex">
        <Link href="/admin/icons" intent="link" content="icon" aria-label="Open admin">
          <Icon name="settings" size="sm" usage="ui.icon-draft-open-admin" />
        </Link>
      </span>
    {/if}
  </Card>
{/if}
