import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import GameReviewPage from "../../src/routes/(app)/history/game/[id]/+page.svelte";

function data(over: Record<string, unknown> = {}) {
  return {
    game: {
      id: "result-viewer",
      quizName: "Myth Trivia",
      startedAt: "2026-01-01 12:00:00",
      finalScore: 80,
      rank: 2,
      playerCount: 3,
    },
    standings: [
      {
        id: "result-winner",
        nickname: "Winner",
        score: 100,
        rank: 1,
        isViewer: false,
      },
      {
        id: "result-viewer",
        nickname: "Viewer",
        score: 80,
        rank: 2,
        isViewer: true,
        avatarSrc: "/avatars/viewer.png",
      },
      {
        id: "result-third",
        nickname: "Third",
        score: 40,
        rank: 3,
        isViewer: false,
      },
    ],
    badges: [],
    breakdown: null,
    categoryName: {},
    stats: { answered: 0, correct: 0, accuracy: null, avgTimeMs: null },
    alreadyFlaggedIds: [],
    uiFlags: { BADGE_DISPLAY: true },
    ...over,
  } as never;
}

describe("game review — final standings", () => {
  it("lists every player's nickname and marks the viewer's row", () => {
    render(GameReviewPage, { props: { data: data() } });
    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
    const viewerRow = screen.getByText("Viewer").closest("li") as HTMLElement;
    expect(within(viewerRow).getByText("You")).toBeInTheDocument();
  });

  it("shows the stored rank for tied co-leaders, not list position", () => {
    render(GameReviewPage, {
      props: {
        data: data({
          standings: [
            {
              id: "result-other",
              nickname: "Other",
              score: 80,
              rank: 1,
              isViewer: false,
            },
            {
              id: "result-viewer",
              nickname: "Viewer",
              score: 80,
              rank: 1,
              isViewer: true,
            },
          ],
        }),
      },
    });
    const viewerRow = screen.getByText("Viewer").closest("li") as HTMLElement;
    expect(within(viewerRow).getByText("1")).toBeInTheDocument();
    expect(within(viewerRow).queryByText("2")).toBeNull();
  });

  it("has no in-page 'Back to history' link", () => {
    render(GameReviewPage, { props: { data: data() } });
    expect(screen.queryByRole("link", { name: "Back to history" })).toBeNull();
  });

  it("renders the stored avatar src for a row that has one", () => {
    render(GameReviewPage, { props: { data: data() } });
    const viewerRow = screen.getByText("Viewer").closest("li") as HTMLElement;
    const img = within(viewerRow).getByRole("img", { name: "Viewer" });
    expect(img).toHaveAttribute("src", "/avatars/viewer.png");
  });

  it("falls back to the default avatar for a row with no stored avatar", () => {
    render(GameReviewPage, { props: { data: data() } });
    const winnerRow = screen.getByText("Winner").closest("li") as HTMLElement;
    expect(within(winnerRow).queryByRole("img")).toBeNull();
  });

  it("shows the observer badge on an observer row", () => {
    render(GameReviewPage, {
      props: {
        data: data({
          standings: [
            {
              id: "result-observer",
              nickname: "Watcher",
              score: 0,
              rank: 1,
              isViewer: false,
              role: "observer",
            },
          ],
        }),
      },
    });
    const observerRow = screen
      .getByText("Watcher")
      .closest("li") as HTMLElement;
    expect(within(observerRow).getByText("Observer")).toBeInTheDocument();
  });
});
