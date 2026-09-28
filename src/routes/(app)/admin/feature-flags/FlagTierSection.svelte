<script lang="ts">
import { ROLE_HIERARCHY } from "@orakl/shared";
import type { UserRole } from "@orakl/shared";
  import { invalidateAll } from "$app/navigation";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Checkbox from "$lib/components/ui/Checkbox.svelte";
  import Switch from "$lib/components/ui/Switch.svelte";
  import type { FlagRow } from "@orakl/protocol";
  
  import { toast } from "@/lib/toast";

  let {
    title,
    hint,
    flags,
    toggleable = false,
    targetable = false,
  }: {
    title: string;
    hint: string;
    flags: FlagRow[];
    /** Whether this tier's rows may be switched on and off from here. */
    toggleable?: boolean;
    /** Whether this tier's rows carry role targeting (role tier only). */
    targetable?: boolean;
  } = $props();

  const ALL_ROLES = Object.keys(ROLE_HIERARCHY) as UserRole[];

  let pending = $state<string | null>(null);
  /** Flag whose role panel is open, and the ticks being edited in it. */
  let editing = $state<string | null>(null);
  let draftRoles = $state<UserRole[]>([]);
  /**
   * States the switch is showing ahead of the server. A flag sits here from the
   * moment it is flipped until `invalidateAll` brings its row back, so the
   * control never stalls on the round-trip. Cleared on failure too, which
   * snaps the switch back to what the server still holds.
   */
  let optimistic = $state<Record<string, boolean>>({});

  /** What the switch shows: the pending flip if there is one, else the row. */
  const switchedOn = (flag: FlagRow) =>
    optimistic[flag.name] ?? flag.state === "on";

  function openRoles(flag: FlagRow) {
    editing = flag.name;
    draftRoles = [...(flag.roles ?? [])];
  }

  function toggleRole(role: UserRole) {
    draftRoles = draftRoles.includes(role)
      ? draftRoles.filter((r) => r !== role)
      : [...draftRoles, role];
  }

  async function saveRoles(flag: FlagRow) {
    // No ticks means no targeting — on for everyone. "On for nobody" is said
    // by switching the flag off, so each state has exactly one spelling.
    // Keep the panel open on a refusal or an ignored click, or the admin's
    // ticks vanish with no idea whether they were saved.
    const saved = await setEnabled(flag, flag.state === "on", {
      roles: draftRoles.length > 0 ? draftRoles : null,
    });
    if (saved) editing = null;
  }

  /** Build rows are decided at build time, so nothing can toggle them live. */
  const readOnly = (flag: FlagRow) => flag.tier === "build";

  /** Off, rule-based and on-for-nobody read neutral; targeted reads info. */
  function tone(flag: FlagRow): "success" | "info" | "neutral" {
    if (flag.state !== "on" || flag.roles?.length === 0) return "neutral";
    return flag.roles ? "info" : "success";
  }

  function stateLabel(flag: FlagRow): string {
    if (readOnly(flag)) return flag.state === "on" ? "In build" : "Excluded";
    if (flag.state === "rules") return "Rule-based";
    if (flag.state === "off") return "Off";
    // An empty role list admits nobody — that is what a corrupt roles cell
    // narrows to, and it must never read as on for everyone.
    if (flag.roles?.length === 0) return "On for no roles";
    return flag.roles ? `On for ${flag.roles.join(", ")}` : "On";
  }

  /** What turning this flag on or off actually means for its audience. */
  function scopeLabel(flag: FlagRow, enabled: boolean): string {
    if (!enabled) return "off";
    const roles = flag.roles;
    return roles?.length ? `on for ${roles.join(", ")}` : "on";
  }

  /** Env and database are worth naming; code and build are the baseline. */
  const sourceLabel = (flag: FlagRow) =>
    flag.source === "env"
      ? "environment"
      : flag.source === "database"
        ? "database"
        : "";

  /**
   * Why a row the tier would otherwise let through is fixed where it stands.
   * The switch stays visible and disabled, so the row still reads at a glance;
   * this is the sentence that says why it will not move. A tier no one can
   * change at all is explained by its section hint instead.
   */
  function blockedReason(flag: FlagRow): string | null {
    if (!toggleable && !targetable) return null;
    if (flag.source === "env")
      return "Set by an environment override; the database cannot change it.";
    if (flag.state === "rules")
      return "Defined by a code rule. Switching it here would replace that rule.";
    if (flag.roles?.length === 0)
      return "Its role list is empty or unreadable, so it reaches nobody. Fix the row in the database.";
    return null;
  }

  async function setEnabled(
    flag: FlagRow,
    enabled: boolean,
    extra: { roles?: UserRole[] | null } = {},
  ): Promise<boolean> {
    // Every switch in the section disables while a write is in flight, but
    // the guard is here too: the control is not the gate, and two POSTs would
    // write two audit rows.
    if (pending) return false;
    pending = flag.name;
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flag: flag.name, enabled, ...extra }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? "Could not change that flag.");
        return false;
      }
      if (extra.roles !== undefined) toast.success(`${flag.name} targeting saved.`);
      await invalidateAll();
      return true;
    } catch {
      toast.error("Could not reach the server.");
      return false;
    } finally {
      pending = null;
    }
  }

  /** How long the way back stays on screen. */
  const UNDO_MS = 10_000;

  /**
   * Move the switch, then write. A refusal or a dead connection snaps it back,
   * so the control never shows a state the server did not take.
   *
   * The toast carries the way back for `UNDO_MS`. Undo is a second write, not
   * a cancellation: the first change is already stored and already travelling
   * to players on the five-minute resolution cache.
   */
  async function flip(flag: FlagRow, next: boolean, undoing = false) {
    // Switches disable while a write is in flight, but the undo button does
    // not — say why nothing happened rather than dropping the click.
    if (pending) {
      toast.error("Another change is still saving. Try that again shortly.");
      return;
    }
    optimistic[flag.name] = next;
    const saved = await setEnabled(flag, next);
    delete optimistic[flag.name];
    if (!saved) return;
    const settled = `${flag.name} is now ${scopeLabel(flag, next)}.`;
    // An undo of an undo is the original change again, so the way back is
    // offered once — but the change itself is always reported.
    if (undoing) {
      toast.success(settled);
      return;
    }
    toast.success(settled, {
      duration: UNDO_MS,
      action: { label: "Undo", onClick: () => flip(flag, !next, true) },
    });
  }
</script>

<section class="flex flex-col gap-3">
  <div class="flex flex-col gap-1">
    <h2 class="text-lg font-semibold">{title}</h2>
    <p class="text-foreground-darker font-sans text-sm max-w-prose">{hint}</p>
  </div>

  <Card variant="default" padding="none" class="gap-0 overflow-hidden">
    {#if flags.length === 0}
      <p class="text-foreground-darker font-sans text-sm p-4">
        No flags in this tier.
      </p>
    {:else}
      <ul class="divide-border divide-y">
        {#each flags as flag (flag.name)}
          {@const blocked = blockedReason(flag)}
          <li class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-4">
            <div class="flex min-w-0 flex-col gap-1">
              <span class="font-mono text-sm">{flag.name}</span>
              <span class="text-foreground-darker font-sans text-sm">
                {flag.description}
              </span>
              {#if blocked}
                <span class="text-foreground-darker font-sans text-xs">
                  {blocked}
                </span>
              {/if}
              {#if flag.power}
                <span class="text-foreground-darker font-sans text-xs">
                  Also needs the <span class="font-mono">{flag.power}</span> power,
                  so on alone is not enough.
                </span>
              {/if}
            </div>
            <div class="flex shrink-0 items-center gap-3">
              {#if sourceLabel(flag)}
                <span class="text-foreground-darker font-sans text-xs">
                  {sourceLabel(flag)}
                </span>
              {/if}
              <Badge variant="status" tone={tone(flag)}>{stateLabel(flag)}</Badge>
              {#if targetable && !blocked}
                <Button
                  variant="ghost"
                  intent="compact"
                  iconAfter="chevron-down"
                  aria-expanded={editing === flag.name}
                  aria-controls="{flag.name}-roles"
                  onclick={() =>
                    editing === flag.name ? (editing = null) : openRoles(flag)}
                >
                  {editing === flag.name ? "Done" : "Roles"}
                </Button>
              {/if}
              <!-- A rule-based flag answers per user, so no two-state control
                   can state it truthfully — `role="switch"` has no mixed
                   value. Its badge and reason carry the row instead. -->
              {#if flag.state !== "rules"}
                <Switch
                  label={flag.name}
                  checked={switchedOn(flag)}
                  disabled={!(toggleable || targetable) ||
                    blocked !== null ||
                    pending !== null}
                  onchange={(next) => flip(flag, next)}
                />
              {/if}
            </div>

            {#if editing === flag.name}
              <div class="w-full" id="{flag.name}-roles">
                <Card variant="mezzanine" padding="sm" class="gap-2">
                  <p class="text-foreground-darker font-sans text-sm">
                    On for the ticked roles only. Tick none to reach everyone.
                    To reach nobody, switch the flag off instead.
                  </p>
                  <div class="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {#each ALL_ROLES as role (role)}
                      <Checkbox
                        id="{flag.name}-role-{role}"
                        label={role}
                        size="sm"
                        checked={draftRoles.includes(role)}
                        onchange={() => toggleRole(role)}
                      />
                    {/each}
                  </div>
                  <div class="flex gap-2">
                    <Button
                      variant={pending ? "disabled" : "secondary"}
                      intent="compact"
                      loading={pending === flag.name}
                      onclick={() => saveRoles(flag)}
                    >
                      Save roles
                    </Button>
                    <Button
                      variant="ghost"
                      intent="compact"
                      onclick={() => (editing = null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </Card>
</section>
