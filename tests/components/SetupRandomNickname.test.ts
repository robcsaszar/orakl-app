import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import list from "../../data/nicknames.json";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import SetupPage from "../../src/routes/(game)/quiz/setup/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

describe("/quiz/setup random nickname", () => {
  it("fills the field from the list on request, and stays editable", async () => {
    const session = new MockQuizSession();
    session.phase = null as never;
    session.membership = "none" as never;
    session.nickname = "";
    render(
      SetupPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    const field = screen.getByLabelText(/^Nickname/) as HTMLInputElement;
    expect(field.value).toBe("");

    await fireEvent.click(
      screen.getByRole("button", { name: "Random nickname" }),
    );
    expect(list).toContain(session.nickname);
    expect(field.value).toBe(session.nickname);

    await fireEvent.input(field, { target: { value: "Mine" } });
    expect(session.nickname).toBe("Mine");
  });
});
