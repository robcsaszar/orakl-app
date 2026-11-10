import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "../../src/routes/+error.svelte";

let status = 503;
let message = "The game server is unreachable. Try again in a moment.";
vi.mock("$app/state", () => ({
  page: {
    get status() {
      return status;
    },
    get error() {
      return { message };
    },
    get url() {
      return new URL("http://localhost/quiz/lobby");
    },
    data: {},
  },
}));
vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));

beforeEach(() => {
  status = 503;
  message = "The game server is unreachable. Try again in a moment.";
});

describe("+error.svelte", () => {
  it("says the oracle is resting for a 503, with the message and a retry, without Report error", () => {
    const { container, getByText, queryByText } = render(ErrorPage);
    expect(container.querySelector("h1")?.textContent).toBe(
      "The oracle is resting",
    );
    expect(container.textContent).toContain(message);
    expect(getByText("Try again")).toBeTruthy();
    expect(queryByText("Report error")).toBeNull();
  });

  it("keeps the generic server error and Report error for a 500", () => {
    status = 500;
    message = "Internal server error";
    const { container, getByText } = render(ErrorPage);
    expect(container.querySelector("h1")?.textContent).toBe("Server error");
    expect(getByText("Report error")).toBeTruthy();
  });
});
