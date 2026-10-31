import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReportImagePage from "../../src/routes/(app)/report-image/+page.svelte";

function fill(container: HTMLElement) {
  for (const [id, v] of [
    ["notice-name", "Ada"],
    ["notice-email", "ada@example.com"],
    ["notice-question", "abc"],
    ["notice-reason", "Wrong"],
    ["notice-right", "privacy"],
  ]) {
    const el = container.querySelector<HTMLInputElement>(`#${id}`);
    if (el) fireEvent.input(el, { target: { value: v } });
  }
}

describe("/report-image", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps submit enabled and flags the unticked good-faith box", async () => {
    const { container, getByRole } = render(ReportImagePage);
    fill(container);
    const button = getByRole("button", { name: "Send notice" });
    expect(button).toBeEnabled();
    await fireEvent.click(button);
    const box = container.querySelector<HTMLInputElement>("#notice-good-faith");
    await waitFor(() => expect(box).toHaveAttribute("aria-invalid", "true"));
    expect(document.activeElement).toBe(box);
  });

  it("wires the DMCA toggle to its fields", async () => {
    const { container } = render(ReportImagePage);
    const toggle = container.querySelector("#notice-dmca");
    expect(toggle).toHaveAttribute("aria-controls", "notice-dmca-fields");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await fireEvent.click(toggle as Element);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("maps a 400 field reason onto that field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: "Validation failed",
              reason: "email: Invalid email",
            }),
            { status: 400 },
          ),
      ),
    );
    const { container, getByRole } = render(ReportImagePage);
    fill(container);
    await fireEvent.click(
      container.querySelector("#notice-good-faith") as Element,
    );
    await fireEvent.click(getByRole("button", { name: "Send notice" }));
    const email = container.querySelector("#notice-email");
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    expect(document.activeElement).toBe(email);
  });

  it("focuses the success heading with the reference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ id: "ref-123" }), { status: 200 }),
      ),
    );
    const { container, getByRole, getByText } = render(ReportImagePage);
    fill(container);
    await fireEvent.click(
      container.querySelector("#notice-good-faith") as Element,
    );
    await fireEvent.click(getByRole("button", { name: "Send notice" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(getByText("Notice received")),
    );
    expect(getByText("ref-123")).toBeInTheDocument();
  });
});
