import type { ServerPhase } from "@orakl/shared";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureQuestion } from "../../src/lib/mock/fixtures.js";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import type { PlayerData } from "../../src/lib/svelte/player-session-view.js";
import CuratorToolboxDrawer from "../../src/routes/(game)/quiz/CuratorToolboxDrawer.svelte";
import { CURATOR_TOOLBOX_DRAWER_ID } from "../../src/routes/(game)/quiz/CuratorToolboxFab.svelte";
import CuratorToolboxPanel from "../../src/routes/(game)/quiz/CuratorToolboxPanel.svelte";

function makeSession(phase: ServerPhase, players: PlayerData[] = []) {
  const session = new MockQuizSession();
  session.isCurator = true;
  session.phase = phase;
  session.players = players;
  return session;
}

const pending: PlayerData = {
  id: "p-pending",
  nickname: "Wanderer",
  avatar: "",
  score: 0,
  status: "pending",
};
const active: PlayerData = {
  id: "p-active",
  nickname: "Seeker",
  avatar: "",
  score: 3,
  status: "active",
};

describe("CuratorToolboxPanel", () => {
  beforeEach(() => {
    Element.prototype.animate = vi.fn().mockReturnValue({
      cancel: vi.fn(),
      onfinish: null,
    });
  });

  it.each([
    ["Stop game", "Stop the game?", "playing", "border-current"],
    ["Reset to setup", "Reset to setup?", "lobby", "border-current"],
    ["Close lobby", "Close the lobby?", "playing", "border-danger"],
  ] as const)(
    "%s uses border progress and shows the confirm question on first click",
    async (name, confirmLabel, phase, ring) => {
      vi.useFakeTimers();
      render(CuratorToolboxPanel, { props: { session: makeSession(phase) } });
      const btn = screen.getByRole("button", { name });
      expect(btn.querySelector(".border-2")).toBeNull();

      await fireEvent.click(btn);
      await vi.advanceTimersByTimeAsync(400);

      expect(btn.querySelector(`.${ring}`)).toBeInTheDocument();
      expect(btn.querySelector(".border-danger")).toBe(
        ring === "border-danger" ? btn.querySelector(".border-2") : null,
      );
      expect(screen.getByText(confirmLabel)).toBeInTheDocument();
      vi.useRealTimers();
    },
  );

  it("renders Cast, Stop game, Reset to setup and Close lobby in a game phase", () => {
    render(CuratorToolboxPanel, { props: { session: makeSession("playing") } });
    expect(
      screen.getByRole("button", { name: /display/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stop game" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset to setup" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close lobby" }),
    ).toBeInTheDocument();
  });

  it("shows the confirm label after the first click on Stop game", async () => {
    render(CuratorToolboxPanel, { props: { session: makeSession("playing") } });
    const stopGame = screen.getByRole("button", { name: "Stop game" });
    await fireEvent.click(stopGame);
    expect(screen.getByText("Stop the game?")).toBeInTheDocument();
  });

  it.each(["lobby", "final_scores"] as const)(
    "omits Stop game in %s",
    (phase) => {
      render(CuratorToolboxPanel, { props: { session: makeSession(phase) } });
      expect(screen.queryByRole("button", { name: "Stop game" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "Close lobby" }),
      ).toBeInTheDocument();
    },
  );

  it("renders Reset to setup in the lobby", () => {
    render(CuratorToolboxPanel, { props: { session: makeSession("lobby") } });
    expect(
      screen.getByRole("button", { name: "Reset to setup" }),
    ).toBeInTheDocument();
  });

  it("renders New quiz and Stop playing on final scores, not Reset to setup", () => {
    render(CuratorToolboxPanel, {
      props: { session: makeSession("final_scores") },
    });
    expect(
      screen.getByRole("button", { name: "New quiz" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stop playing along" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset to setup" })).toBeNull();
  });

  it("renders Approve/Reject for a pending player and Remove for an active one", () => {
    render(CuratorToolboxPanel, {
      props: { session: makeSession("playing", [pending, active]) },
    });
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Seeker" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove and block Seeker" }),
    ).toBeInTheDocument();
  });

  describe("compact mode", () => {
    it("shows Next question when playing, manual, and revealed", () => {
      const session = makeSession("playing");
      session.advanceMode = "manual";
      session.correctAnswerId = "a1";
      render(CuratorToolboxPanel, { props: { session, compact: true } });
      expect(
        screen.getByRole("button", { name: "Next question" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Close lobby" })).toBeNull();
    });

    it("shows See final scores on the last question", () => {
      const session = makeSession("playing");
      session.advanceMode = "manual";
      session.correctAnswerId = "a1";
      session.currentQuestion = {
        ...fixtureQuestion("multiple_choice"),
        questionIndex: 2,
        totalQuestions: 3,
      };
      render(CuratorToolboxPanel, { props: { session, compact: true } });
      expect(
        screen.getByRole("button", { name: "See final scores" }),
      ).toBeInTheDocument();
    });

    it("omits the next button when not revealed", () => {
      const session = makeSession("playing");
      session.advanceMode = "manual";
      render(CuratorToolboxPanel, { props: { session, compact: true } });
      expect(
        screen.queryByRole("button", { name: "Next question" }),
      ).toBeNull();
    });

    it("calls advanceToNextQuestion when clicked", async () => {
      const session = makeSession("playing");
      session.advanceMode = "manual";
      session.correctAnswerId = "a1";
      const spy = vi.spyOn(session, "advanceToNextQuestion");
      render(CuratorToolboxPanel, { props: { session, compact: true } });
      await fireEvent.click(
        screen.getByRole("button", { name: "Next question" }),
      );
      expect(spy).toHaveBeenCalled();
    });
  });

  it("drawer surface renders the same panel once opened", async () => {
    render(CuratorToolboxDrawer, {
      props: { session: makeSession("playing", [pending, active]) },
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    window.dispatchEvent(
      new CustomEvent("drawer:open", {
        detail: { id: CURATOR_TOOLBOX_DRAWER_ID },
      }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    for (const name of [
      "Stop game",
      "Reset to setup",
      "Close lobby",
      "Approve",
      "Remove Seeker",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
