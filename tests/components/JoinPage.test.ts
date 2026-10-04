import { ADJECTIVES, NOUNS } from "@orakl/shared";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import { JOIN_ERROR_COPY } from "../../src/lib/svelte/quizSession.svelte.js";
import JoinPage from "../../src/routes/(game)/join/JoinPage.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));
vi.mock("../../src/lib/toast.js", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { toast } from "../../src/lib/toast.js";

function makeSession() {
  const session = new MockQuizSession();
  session.lobbyCode = "";
  return session;
}

describe("JoinPage", () => {
  it("renders the lobby-code input and Next button", () => {
    const session = makeSession();
    render(
      JoinPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    expect(screen.getByLabelText("Lobby code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("session.error shows on the lobby-code field as well as the toast", () => {
    const session = makeSession();
    session.error = JOIN_ERROR_COPY.device_blocked;
    render(
      JoinPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    expect(
      screen.getByText(JOIN_ERROR_COPY.device_blocked),
    ).toBeInTheDocument();
    expect(document.getElementById("lobby-code-entry")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("session.error = device_blocked copy → toast.error with that string", () => {
    const session = makeSession();
    session.error = JOIN_ERROR_COPY.device_blocked;
    render(
      JoinPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    expect(toast.error).toHaveBeenCalledWith(JOIN_ERROR_COPY.device_blocked);
  });

  it("session.error = device_in_lobby copy → toast.error with that string", () => {
    const session = makeSession();
    session.error = JOIN_ERROR_COPY.device_in_lobby;
    render(
      JoinPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    expect(toast.error).toHaveBeenCalledWith(JOIN_ERROR_COPY.device_in_lobby);
  });

  it("session.error = failed copy → toast.error with that string", () => {
    const session = makeSession();
    session.error = JOIN_ERROR_COPY.failed;
    render(
      JoinPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    expect(toast.error).toHaveBeenCalledWith(JOIN_ERROR_COPY.failed);
  });

  it("JOIN_ERROR_COPY.lobby_full matches the copy connect() passes to toast.info", () => {
    expect(JOIN_ERROR_COPY.lobby_full).toBe(
      "The lobby is full. You're watching as an observer.",
    );
  });

  it("lobby-code input fits the longest generated code", () => {
    const session = makeSession();
    render(
      JoinPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    const longest =
      Math.max(...ADJECTIVES.map((w) => w.length)) +
      1 +
      Math.max(...NOUNS.map((w) => w.length));
    const input = screen.getByLabelText("Lobby code") as HTMLInputElement;
    expect(input.maxLength).toBeGreaterThanOrEqual(longest);
  });
});
