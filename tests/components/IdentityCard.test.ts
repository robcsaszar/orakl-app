import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const LOCKED = "A moderator set your name. It can't be changed in this lobby.";
const session = {
  nickname: "Alice",
  selectedAvatarId: "",
  getAvatarSrc: () => "",
  openAvatarSelector: vi.fn(),
  saveNickname: vi.fn(async () => LOCKED as string | null),
};
vi.mock("@/lib/svelte/quizSession.svelte.js", () => ({
  getQuizSession: () => session,
}));

import IdentityCard from "../../src/routes/(game)/IdentityCard.svelte";

describe("IdentityCard", () => {
  it("shows the moderator copy when the server refuses the rename", async () => {
    render(IdentityCard);
    await userEvent.click(
      screen.getByRole("button", { name: "Edit nickname" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(LOCKED);
  });

  it("hides the refusal once the edit is cancelled", async () => {
    render(IdentityCard);
    await userEvent.click(
      screen.getByRole("button", { name: "Edit nickname" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("textbox", { name: "Your nickname" }),
    ).not.toHaveAttribute("aria-invalid");
  });
});
