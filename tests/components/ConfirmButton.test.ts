import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";

// jsdom does not implement the Web Animations API — stub it
beforeEach(() => {
  Element.prototype.animate = vi.fn().mockReturnValue({
    cancel: vi.fn(),
    onfinish: null,
  });
});

const icon = createRawSnippet(() => ({
  render: () => `<svg aria-hidden="true"></svg>`,
}));

function renderButton(extraProps: Record<string, unknown> = {}) {
  return render(ConfirmButton, {
    props: { label: "Delete", icon, ...extraProps },
  });
}

describe("ConfirmButton", () => {
  it("shows the initial label", () => {
    renderButton();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("first click switches to confirm state", async () => {
    const user = userEvent.setup();
    renderButton({ confirmLabel: "Are you sure?" });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("button aria-label updates to confirmAriaLabel after first click", async () => {
    const user = userEvent.setup();
    renderButton({ confirmAriaLabel: "Click again to confirm" });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(
      screen.getByRole("button", { name: "Click again to confirm" }),
    ).toBeInTheDocument();
  });

  it("second click calls onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderButton({ onConfirm });
    const btn = screen.getByRole("button", { name: "Delete" });
    await user.click(btn);
    await user.click(
      screen.getByRole("button", { name: "Click again to confirm" }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("Escape key cancels confirm state", async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("renders inside a form when formAction is provided", () => {
    renderButton({ formAction: "?/delete" });
    const form = screen.getByRole("button").closest("form");
    expect(form).toHaveAttribute("action", "?/delete");
    expect(form).toHaveAttribute("method", "POST");
  });

  it("danger variant renders a border-danger ring (regression)", async () => {
    const user = userEvent.setup();
    const { container } = renderButton({
      progressStyle: "border",
      revealDelay: 0,
    });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const ring = container.querySelector("[aria-hidden='true']");
    expect(ring).toHaveClass("border-danger");
    expect(ring).not.toHaveClass("border-current");
  });

  it("neutral variant renders a border-current ring, not border-danger", async () => {
    const user = userEvent.setup();
    const { container } = renderButton({
      progressStyle: "border",
      revealDelay: 0,
      confirmVariant: "neutral",
    });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const ring = container.querySelector("[aria-hidden='true']");
    expect(ring).toHaveClass("border-current");
    expect(ring).not.toHaveClass("border-danger");
  });

  it("neutral variant confirm-state button has no danger text colour", async () => {
    const user = userEvent.setup();
    renderButton({ confirmVariant: "neutral" });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const btn = screen.getByRole("button", { name: "Click again to confirm" });
    expect(btn).not.toHaveClass("text-danger-lighter");
  });
});
