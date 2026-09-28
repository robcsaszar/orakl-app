import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import SetupPage from "../../src/routes/(game)/quiz/setup/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const dbAvatars = [
  { id: "adder", title: "Adder", description: "", category: "", src: "a.png" },
  { id: "angel", title: "Angel", description: "", category: "", src: "b.png" },
];

async function mountWith(storedId: string) {
  const session = new MockQuizSession();
  session.phase = null as never;
  session.membership = "none" as never;
  session.selectedAvatarId = storedId;
  session.dbAvatars = dbAvatars;
  render(
    SetupPage as never,
    {},
    { wrapper: LobbySessionHarness, wrapperProps: { session } },
  );
  await tick();
  return session;
}

describe("/quiz/setup gives a fresh player an avatar", () => {
  it("rallies when nothing is stored", async () => {
    const session = await mountWith("");
    expect(session.selectedAvatarId).not.toBe("");
  });

  it("rallies when the stored id no longer resolves to an avatar", async () => {
    const session = await mountWith("retired-avatar");
    expect(session.selectedAvatarId).not.toBe("retired-avatar");
    expect(session.selectedAvatarId).not.toBe("");
  });

  it("keeps a stored id that still resolves", async () => {
    const session = await mountWith("angel");
    expect(session.selectedAvatarId).toBe("angel");
  });
});
