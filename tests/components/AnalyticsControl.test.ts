import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsControl from "../../src/lib/components/layout/AnalyticsControl.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// jsdom's location.reload is unimplemented; a full reload is the contract.
const reload = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/reload.js", () => ({ reload }));

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(async () =>
    Promise.resolve({ ok: true, json: async () => ({}) } as Response),
  );
});

describe("AnalyticsControl (decision #12)", () => {
  it("offers to turn analytics off and POSTs the choice", async () => {
    const user = userEvent.setup();
    render(AnalyticsControl, {
      props: { analytics: { enabled: true, browserSignal: false } },
    });
    await user.click(
      screen.getByRole("button", { name: "Turn off analytics" }),
    );
    expect(fetch).toHaveBeenCalledWith("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(reload).toHaveBeenCalledOnce();
  });

  it("shows the off state and offers to turn it back on", async () => {
    const user = userEvent.setup();
    render(AnalyticsControl, {
      props: { analytics: { enabled: false, browserSignal: false } },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Analytics is off.");
    await user.click(screen.getByRole("button", { name: "Turn on analytics" }));
    expect(fetch).toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({ body: JSON.stringify({ enabled: true }) }),
    );
  });

  it("explains a browser privacy signal and offers no control", () => {
    render(AnalyticsControl, {
      props: { analytics: { enabled: false, browserSignal: true } },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      /asks not to be tracked/,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
