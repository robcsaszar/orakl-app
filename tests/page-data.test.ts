// @vitest-environment node
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  API_UNAVAILABLE_MESSAGE,
  isApiUnavailable,
  pageData,
} from "../src/lib/page-data.js";
import { load as rootLoad } from "../src/routes/+layout.js";
import { load as quizLoad } from "../src/routes/(game)/quiz/+layout.js";

const answering = (status: number, body?: unknown) =>
  (async () =>
    body === undefined
      ? new Response(null, { status })
      : Response.json(body, { status })) as unknown as typeof fetch;

const loadArgs = (fetch: typeof globalThis.fetch) =>
  ({
    fetch,
    url: new URL("http://localhost/quiz/lobby"),
    untrack: <T>(fn: () => T) => fn(),
  }) as never;

describe.each([502, 503, 504])("an API %i", (status) => {
  it("pageData throws a 503 page error with the unreachable message", async () => {
    await expect(
      pageData(new Response(null, { status })),
    ).rejects.toMatchObject({
      status: 503,
      body: { message: API_UNAVAILABLE_MESSAGE },
    });
  });

  it("the root layout load throws a 503 page error", async () => {
    await expect(rootLoad(loadArgs(answering(status)))).rejects.toMatchObject({
      status: 503,
      body: { message: API_UNAVAILABLE_MESSAGE },
    });
  });

  it("the quiz layout load throws a 503 page error", async () => {
    await expect(quizLoad(loadArgs(answering(status)))).rejects.toMatchObject({
      status: 503,
      body: { message: API_UNAVAILABLE_MESSAGE },
    });
  });
});

describe("a 5xx that carries a body message", () => {
  it("pageData still reports the API as unreachable", async () => {
    const res = Response.json(
      { message: "upstream exploded" },
      { status: 503 },
    );
    await expect(pageData(res)).rejects.toMatchObject({
      status: 503,
      body: { message: API_UNAVAILABLE_MESSAGE },
    });
  });
});

describe("other non-OK statuses", () => {
  it("pageData keeps a 404 with the body message", async () => {
    const res = Response.json({ message: "No such game" }, { status: 404 });
    await expect(pageData(res)).rejects.toMatchObject({
      status: 404,
      body: { message: "No such game" },
    });
  });

  it("the layout loads keep the API status", async () => {
    await expect(rootLoad(loadArgs(answering(404)))).rejects.toMatchObject({
      status: 404,
    });
    await expect(quizLoad(loadArgs(answering(404)))).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("isApiUnavailable", () => {
  it("is true for 502, 503 and 504 only", () => {
    expect([500, 501, 502, 503, 504, 505].map(isApiUnavailable)).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});

describe("pageData non-OK bodies", () => {
  it("a bodyless 500 keeps its status with a generic message", async () => {
    await expect(
      pageData(new Response(null, { status: 500 })),
    ).rejects.toMatchObject({
      status: 500,
      body: { message: expect.stringMatching(/\S/) },
    });
  });

  it("a 403 redirect body with a route redirects there", async () => {
    const res = Response.json(
      { error: "redirect", route: "/join" },
      { status: 403 },
    );
    await expect(pageData(res)).rejects.toMatchObject({
      status: 303,
      location: "/join",
    });
  });

  it("a redirect body with no route does not redirect", async () => {
    const res = Response.json({ error: "redirect" }, { status: 403 });
    await expect(pageData(res)).rejects.toMatchObject({ status: 403 });
  });

  it("a route under another error code does not redirect", async () => {
    const res = Response.json(
      { error: "forbidden", route: "/join", message: "Nope" },
      { status: 403 },
    );
    await expect(pageData(res)).rejects.toMatchObject({
      status: 403,
      body: { message: "Nope" },
    });
  });
});

describe("pageData OK bodies", () => {
  it("without a schema returns the body as is", async () => {
    await expect(pageData(Response.json({ a: 1 }))).resolves.toEqual({ a: 1 });
  });

  it("with a schema returns the decoded body", async () => {
    const schema = Schema.Struct({ a: Schema.Number });
    await expect(pageData(Response.json({ a: 1 }), schema)).resolves.toEqual({
      a: 1,
    });
  });

  it("a body failing the schema is a 502", async () => {
    const schema = Schema.Struct({ a: Schema.Number });
    await expect(
      pageData(Response.json({ a: "x" }), schema),
    ).rejects.toMatchObject({
      status: 502,
      body: { message: expect.stringMatching(/\S/) },
    });
  });
});
