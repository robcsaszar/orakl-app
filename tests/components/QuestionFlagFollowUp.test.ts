import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionFlagFollowUp from "$lib/components/results/QuestionFlagFollowUp.svelte";
import { toast } from "../../src/lib/toast.js";

vi.mock("../../src/lib/toast.js", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

beforeEach(() => {
  // ResponsiveOverlay's onMount always queries matchMedia, even while closed.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.clearAllMocks();
});

function renderFollowUp(extra: Record<string, unknown> = {}) {
  return render(QuestionFlagFollowUp, {
    props: { questionId: "q-1", selectedAnswerText: "Paris", ...extra },
  });
}

describe("QuestionFlagFollowUp", () => {
  it("shows a collapsed flag button by default", () => {
    renderFollowUp();
    expect(
      screen.getByRole("button", { name: /flag this question/i }),
    ).toBeInTheDocument();
  });

  it("an already-flagged question shows flagged state with no control", () => {
    renderFollowUp({ alreadyFlagged: true });
    expect(screen.getByText(/^flagged/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /flag this question/i }),
    ).not.toBeInTheDocument();
  });

  it("expands to the report actions on click", async () => {
    const user = userEvent.setup();
    renderFollowUp();
    await user.click(
      screen.getByRole("button", { name: /flag this question/i }),
    );
    expect(
      screen.getByRole("button", { name: /submit without elaboration/i }),
    ).toBeInTheDocument();
  });

  it("submit without elaboration posts questionId + selectedAnswerText only, then shows flagged", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);

    renderFollowUp();
    await user.click(
      screen.getByRole("button", { name: /flag this question/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /submit without elaboration/i }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/questions/q-1/flags",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toEqual({ questionId: "q-1", selectedAnswerText: "Paris" });
    expect(toast.success).toHaveBeenCalled();
    expect(await screen.findByText(/^flagged/i)).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("cancel collapses back without any network request", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderFollowUp();
    await user.click(
      screen.getByRole("button", { name: /flag this question/i }),
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /flag this question/i }),
    ).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("a 409 already_flagged response is treated as success (toast + flagged, no crash)", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 409 });
    vi.stubGlobal("fetch", fetchSpy);

    renderFollowUp();
    await user.click(
      screen.getByRole("button", { name: /flag this question/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /submit without elaboration/i }),
    );

    expect(toast.info).toHaveBeenCalled();
    expect(await screen.findByText(/^flagged/i)).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("a 404 (question deleted) collapses to a removed line instead of offering a retry", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchSpy);

    renderFollowUp();
    await user.click(
      screen.getByRole("button", { name: /flag this question/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /submit without elaboration/i }),
    );

    expect(toast.info).toHaveBeenCalledWith(
      "This question has left the archive.",
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(await screen.findByText(/^question removed/i)).toBeInTheDocument();
    expect(screen.queryByText(/^flagged/i)).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("a network failure keeps the report actions open and shows an error toast", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));

    renderFollowUp();
    await user.click(
      screen.getByRole("button", { name: /flag this question/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /submit without elaboration/i }),
    );

    expect(toast.error).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /submit without elaboration/i }),
    ).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("elaborate and submit opens the dialog with reason/url inputs", async () => {
    const user = userEvent.setup();
    renderFollowUp();
    await user.click(
      screen.getByRole("button", { name: /flag this question/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /elaborate and submit/i }),
    );

    expect(
      await screen.findByLabelText(/what's wrong with this question/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/supporting link/i)).toBeInTheDocument();
  });
});
