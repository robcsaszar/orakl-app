import type { ServerMessage } from "@orakl/protocol";
import { describe, expect, it, vi } from "vitest";
import { dispatchGameFrame, type GameFrameSink } from "../src/index.js";

/** Every ServerMessage variant paired with the sink callback it must invoke. */
const CASES: {
  callback: keyof GameFrameSink;
  msg: ServerMessage;
}[] = [
  {
    callback: "onJoinAccepted",
    msg: { type: "join:accepted", playerId: "p1", quizName: "Quiz" },
  },
  {
    callback: "onJoinRejected",
    msg: { type: "join:rejected", reason: "full" },
  },
  {
    callback: "onLobbyUpdate",
    msg: { type: "lobby:update", players: [] },
  },
  {
    callback: "onLobbyEnded",
    msg: { type: "lobby:ended", reason: "curator ended" },
  },
  {
    callback: "onLobbyReset",
    msg: { type: "lobby:reset" },
  },
  {
    callback: "onPlayerNicknameChanged",
    msg: {
      type: "player:nickname_changed",
      playerId: "p1",
      nickname: "Bob",
    },
  },
  {
    callback: "onGameStart",
    msg: {
      type: "game:start",
      totalQuestions: 10,
      timerDuration: 30,
      advanceMode: "auto_5",
    },
  },
  {
    callback: "onQuestion",
    msg: {
      type: "game:question",
      questionIndex: 0,
      totalQuestions: 10,
      text: "2+2?",
      categoryId: "math",
      answers: [{ id: "a1", text: "4" }],
      timeRemaining: 20,
      serverTs: Date.now(),
    },
  },
  {
    callback: "onTick",
    msg: { type: "game:tick", timeRemaining: 15, serverTs: Date.now() },
  },
  {
    callback: "onPlayerAnswered",
    msg: {
      type: "player:answered",
      playerId: "p1",
      answeredCount: 1,
      totalCount: 4,
    },
  },
  {
    callback: "onRoundResult",
    msg: {
      type: "game:round-result",
      correctAnswerId: "a1",
      players: [],
      playerAnswers: {},
    },
  },
  {
    callback: "onFinalScores",
    msg: { type: "game:final-scores", players: [] },
  },
  {
    callback: "onRoleSelectionStart",
    msg: { type: "role:selection-start", players: [], timeRemaining: 10 },
  },
  {
    callback: "onRoleSelectionUpdate",
    msg: { type: "role:selection-update", players: [], timeRemaining: 5 },
  },
  {
    callback: "onRoleSelectionLocked",
    msg: { type: "role:selection-locked", players: [] },
  },
  {
    callback: "onPlayerRemoved",
    msg: { type: "player:removed", playerId: "p1" },
  },
  {
    callback: "onIntermission",
    msg: { type: "game:intermission", frozenTimeRemaining: 12 },
  },
  {
    callback: "onResume",
    msg: { type: "game:resume", timeRemaining: 12 },
  },
  {
    callback: "onPlayerEmote",
    msg: {
      type: "player:emote",
      playerId: "p1",
      emoteId: "thumbsup",
      offsetX: 0.5,
      offsetY: 0.5,
    },
  },
  {
    callback: "onGameError",
    msg: { type: "game:error", code: "no_questions", message: "oops" },
  },
  {
    callback: "onPing",
    msg: { type: "game:ping" },
  },
  {
    callback: "onRateAck",
    msg: { type: "player:rate-ack", questionId: "q1", ok: true },
  },
];

const ALL_CALLBACK_NAMES = CASES.map((c) => c.callback);

function makeSink(): { sink: GameFrameSink; calls: Record<string, number> } {
  const calls: Record<string, number> = {};
  const sink: GameFrameSink = {};
  for (const name of ALL_CALLBACK_NAMES) {
    calls[name] = 0;
    (sink as any)[name] = vi.fn(() => {
      calls[name]++;
    });
  }
  return { sink, calls };
}

describe("dispatchGameFrame", () => {
  it.each(CASES)(
    "invokes exactly $callback for $msg.type and no other callback",
    ({ callback, msg }) => {
      const { sink, calls } = makeSink();
      dispatchGameFrame(msg, sink);

      for (const name of ALL_CALLBACK_NAMES) {
        if (name === callback) {
          expect(calls[name]).toBe(1);
        } else {
          expect(calls[name]).toBe(0);
        }
      }
    },
  );

  it("passes the exact payload through to the callback", () => {
    const onQuestion = vi.fn();
    const msg = CASES.find((c) => c.callback === "onQuestion")?.msg;
    dispatchGameFrame(msg as ServerMessage, { onQuestion });
    expect(onQuestion).toHaveBeenCalledWith(msg);
  });

  it("no-ops when the sink has no matching callback", () => {
    expect(() => dispatchGameFrame({ type: "game:ping" }, {})).not.toThrow();
  });
});
