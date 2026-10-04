import { describe, expect, it } from "vitest";
import {
  ackRating,
  RATING_ERROR_MS,
  ratingFor,
  tapRating,
} from "../src/lib/question-rating-state";

describe("question rating state", () => {
  it("ratingFor returns a fresh state for the question", () => {
    expect(ratingFor("q-1")).toEqual({
      questionId: "q-1",
      pending: null,
      queued: null,
      result: null,
    });
    expect(RATING_ERROR_MS).toBe(2000);
  });

  it("idle tap sends and goes pending", () => {
    const { state, send } = tapRating(ratingFor("q-1"), "up");
    expect(send).toBe("up");
    expect(state.pending).toBe("up");
    expect(state.queued).toBeNull();
  });

  it("tap while pending queues the newest and sends nothing", () => {
    const first = tapRating(ratingFor("q-1"), "up").state;
    const second = tapRating(first, "down");
    expect(second.send).toBeNull();
    expect(second.state.pending).toBe("up");
    expect(second.state.queued).toBe("down");
    const third = tapRating(second.state, "up");
    expect(third.state.queued).toBe("up");
  });

  it("ok ack sets result ok and returns no send", () => {
    const pending = tapRating(ratingFor("q-1"), "up").state;
    const { state, send } = ackRating(pending, "q-1", true);
    expect(send).toBeNull();
    expect(state.pending).toBeNull();
    expect(state.result).toEqual({ rating: "up", ok: true, seq: 1 });
  });

  it("ack with a queued different rating sends it and makes it pending", () => {
    let s = tapRating(ratingFor("q-1"), "up").state;
    s = tapRating(s, "down").state;
    const { state, send } = ackRating(s, "q-1", true);
    expect(send).toBe("down");
    expect(state.pending).toBe("down");
    expect(state.queued).toBeNull();
    expect(state.result).toEqual({ rating: "up", ok: true, seq: 1 });
  });

  it("ack drops a queued tap equal to the rating just confirmed", () => {
    let s = tapRating(ratingFor("q-1"), "up").state;
    s = tapRating(s, "up").state;
    const { state, send } = ackRating(s, "q-1", true);
    expect(send).toBeNull();
    expect(state.pending).toBeNull();
    expect(state.queued).toBeNull();
  });

  it("ack for another question id is ignored", () => {
    const pending = tapRating(ratingFor("q-1"), "up").state;
    const { state, send } = ackRating(pending, "q-2", true);
    expect(send).toBeNull();
    expect(state).toEqual(pending);
  });

  it("ack with nothing pending is ignored", () => {
    const fresh = ratingFor("q-1");
    expect(ackRating(fresh, "q-1", true).state).toEqual(fresh);
  });

  it("error ack sets result ok false", () => {
    const pending = tapRating(ratingFor("q-1"), "down").state;
    const { state, send } = ackRating(pending, "q-1", false);
    expect(send).toBeNull();
    expect(state.result).toEqual({ rating: "down", ok: false, seq: 1 });
  });

  it("tap on the thumb already showing a tick is a no-op", () => {
    let s = tapRating(ratingFor("q-1"), "up").state;
    s = ackRating(s, "q-1", true).state;
    const { state, send } = tapRating(s, "up");
    expect(send).toBeNull();
    expect(state).toEqual(s);
  });

  it("tap on the other thumb after a tick flips; seq bumps", () => {
    let s = tapRating(ratingFor("q-1"), "up").state;
    s = ackRating(s, "q-1", true).state;
    const t = tapRating(s, "down");
    expect(t.send).toBe("down");
    const a = ackRating(t.state, "q-1", true).state;
    expect(a.result).toEqual({ rating: "down", ok: true, seq: 2 });
  });
});
