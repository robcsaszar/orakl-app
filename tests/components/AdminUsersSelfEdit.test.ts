import type { UserPower } from "@orakl/shared";
import { powerDescription } from "@orakl/shared";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsers from "../../src/routes/(app)/admin/users/AdminUsers.svelte";

const SELF = "self-1";
const OTHER = "other-1";
const HELD: UserPower = "can-import-quizzes";
const NOT_HELD: UserPower = "can-manage-features";
/** Gates nothing, so self-edit leaves it open. */
const DISPLAY: UserPower = "is-power-user";

function listItem(id: string, role: string, powers: UserPower[]) {
  return {
    id,
    email: `${id}@test.local`,
    role,
    nickname: null,
    avatar: null,
    powers: JSON.stringify(powers),
    created_at: null,
    admin_note: null,
    leaderboard_excluded: 0,
  };
}

beforeEach(() => {
  // Opening the editor fetches the grant history; the rule under test is the
  // modal's own, so an empty ledger is enough.
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ grants: [], powerGrants: [] }),
    }),
  );
});

function renderUsers(
  selfRole = "admin",
  offered: UserPower[] = [HELD, NOT_HELD],
) {
  return render(AdminUsers, {
    props: {
      initial: {
        users: [
          listItem(SELF, selfRole, [HELD]),
          listItem(OTHER, "member", []),
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      currentUserId: SELF,
      roles: ["member", "curator", "admin"],
      allPowers: offered,
      pendingRequests: [],
    },
  });
}

async function openEditorFor(email: string) {
  const row = screen.getByText(email).closest("tr") ?? document.body;
  const edit = Array.from(row.querySelectorAll("button")).find((b) =>
    /edit/i.test(b.textContent ?? ""),
  );
  await fireEvent.click(edit as HTMLButtonElement);
  // The history fetch resolves a microtask later; let it settle.
  await Promise.resolve();
}

const powerBox = (p: UserPower) =>
  document.querySelector(`#power-${p}`) as HTMLInputElement | null;

const powersToggle = () =>
  screen.getByRole("button", { name: /^(show|hide)$/i });

const powersPanel = () => document.getElementById("powers-panel");

const powersSummary = () => document.getElementById("powers-summary");

/** The list opens on request, so anything inspecting a toggle opens it first. */
async function expandPowers() {
  await fireEvent.click(powersToggle());
}

const roleOption = (role: string) =>
  Array.from(
    document.querySelectorAll<HTMLOptionElement>("#edit-role option"),
  ).find((o) => o.value === role);

describe("AdminUsers — editing your own account", () => {
  it("offers to revoke a power you hold", async () => {
    renderUsers();
    await openEditorFor(`${SELF}@test.local`);
    await expandPowers();
    expect(powerBox(HELD)?.disabled).toBe(false);
  });

  it("offers a power you do not hold, so a revocation is reversible", async () => {
    renderUsers();
    await openEditorFor(`${SELF}@test.local`);
    await expandPowers();
    expect(powerBox(NOT_HELD)?.disabled).toBe(false);
  });

  it("offers every rank at or below your own, and none above", async () => {
    // A curator, so there is a rank above to withhold — an admin fixture would
    // pass this whether or not anything is disabled.
    renderUsers("curator");
    await openEditorFor(`${SELF}@test.local`);
    expect(roleOption("member")?.disabled).toBe(false);
    expect(roleOption("curator")?.disabled).toBe(false); // your own rank is not a raise
    expect(roleOption("admin")?.disabled).toBe(true);
  });

  it("says why, so a disabled box does not read as a bug", async () => {
    renderUsers();
    await openEditorFor(`${SELF}@test.local`);
    expect(screen.getByText(/you can step down, not up/i)).toBeTruthy();
  });
});

describe("AdminUsers — editing another account", () => {
  it("leaves every power and rank offered", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    await expandPowers();
    expect(powerBox(HELD)?.disabled).toBe(false);
    expect(powerBox(NOT_HELD)?.disabled).toBe(false);
    expect(roleOption("admin")?.disabled).toBe(false);
  });

  it("does not explain a rule that does not apply", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    expect(screen.queryByText(/you can step down, not up/i)).toBeNull();
  });
});

describe("AdminUsers — the powers list explains itself", () => {
  it("prints a description under every toggle it offers", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    await expandPowers();

    for (const power of [HELD, NOT_HELD]) {
      const desc = document.getElementById(`power-${power}-desc`);
      expect(desc, power).not.toBeNull();
      expect(desc?.textContent?.trim()).toBe(powerDescription(power));
    }
  });

  it("wires each description to its own checkbox, not just beside it", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    await expandPowers();
    // Without aria-describedby a screen reader hears the bare identifier.
    expect(powerBox(HELD)?.getAttribute("aria-describedby")).toBe(
      `power-${HELD}-desc`,
    );
  });

  it("describes a power on your own row the same way as on another's", async () => {
    renderUsers();
    await openEditorFor(`${SELF}@test.local`);
    await expandPowers();
    expect(
      document.getElementById(`power-${NOT_HELD}-desc`)?.textContent?.trim(),
    ).toBe(powerDescription(NOT_HELD));
  });

  it("offers a display power on your own account, described the same way", async () => {
    renderUsers("admin", [HELD, NOT_HELD, DISPLAY]);
    await openEditorFor(`${SELF}@test.local`);
    await expandPowers();
    expect(powerBox(DISPLAY)?.disabled).toBe(false);
    expect(
      document.getElementById(`power-${DISPLAY}-desc`)?.textContent?.trim(),
    ).toBe(powerDescription(DISPLAY));
  });
});

describe("AdminUsers — the powers section opens on request", () => {
  it("starts closed, so a growing list does not bury the rest of the form", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    expect(powersPanel()).not.toBeVisible();
    expect(powersToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens and closes again on the toggle", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);

    await expandPowers();
    expect(powersPanel()).toBeVisible();
    expect(powersToggle()).toHaveAttribute("aria-expanded", "true");

    await fireEvent.click(powersToggle());
    expect(powersPanel()).not.toBeVisible();
    expect(powersToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("names a live element in aria-controls whether open or shut", async () => {
    // A dangling `aria-controls` is announced as a broken reference; the panel
    // stays mounted and hides, rather than unmounting.
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    const target = powersToggle().getAttribute("aria-controls") ?? "";
    expect(document.getElementById(target)).not.toBeNull();
    await expandPowers();
    expect(document.getElementById(target)).not.toBeNull();
  });

  it("summarises what the row holds while it is shut", async () => {
    renderUsers();
    await openEditorFor(`${SELF}@test.local`);
    expect(powersSummary()).toBeVisible();
    expect(powersSummary()).toHaveTextContent(HELD);
  });

  it("says so plainly when the row holds none", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    expect(powersSummary()).toHaveTextContent(/no powers granted/i);
  });

  it("follows the draft, not the saved set", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    await expandPowers();
    await fireEvent.click(powerBox(NOT_HELD) as HTMLInputElement);
    await fireEvent.click(powersToggle());

    // The row started with none, so the tick is the whole of the summary.
    expect(powersSummary()).toBeVisible();
    expect(powersSummary()).toHaveTextContent(NOT_HELD);
    expect(powersSummary()).not.toHaveTextContent(/no powers granted/i);
  });

  it("shuts again when a different row is opened", async () => {
    renderUsers();
    await openEditorFor(`${OTHER}@test.local`);
    await expandPowers();
    expect(powersPanel()).toBeVisible();

    await fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await openEditorFor(`${SELF}@test.local`);
    expect(powersPanel()).not.toBeVisible();
  });
});
