import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ManageNotices from "../../src/routes/(app)/manage/notices/ManageNotices.svelte";

const notice = {
  id: "n1",
  createdAt: "2026-01-01 10:00:00",
  decidedAt: null,
  status: "open",
  kind: "dsa",
  notifierName: "Ann",
  notifierEmail: "a@b.c",
  reason: "Mine",
  rightOrLaw: "Copyright",
  workIdentified: null,
  signature: null,
  questionId: "q1",
  questionRef: "q1",
  excerpt: "Q?",
  hasImage: true,
  imageDisabled: false,
  previewUrl: "/p.png",
  ageHours: 3,
  overdue: false,
  actions: [],
} as const;

describe("ManageNotices", () => {
  it("heads the page and labels the preview", () => {
    render(ManageNotices, { props: { initial: [notice as never] } });
    expect(
      screen.getByRole("heading", { level: 1, name: "Image notices" }),
    ).toBeTruthy();
    expect(screen.getByAltText("Reported upload")).toBeTruthy();
  });

  it("disables actions until a statement is typed", async () => {
    const user = userEvent.setup();
    render(ManageNotices, { props: { initial: [notice as never] } });
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(
      (screen.getByRole("button", { name: "Reject" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(/Up to 2000 characters/)).toBeTruthy();
    await user.type(screen.getByLabelText(/Statement of reasons/), "Because");
    expect(
      (screen.getByRole("button", { name: "Reject" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
