import type { AuthUser, UserPower, UserRole } from "@orakl/shared";
import { describe, expect, it, vi } from "vitest";

// The stub reports `dev: true`, which short-circuits the gate — force the
// production branch, which is the only one that gates at all.
vi.mock("$app/environment", () => ({
  dev: false,
  browser: false,
  building: false,
  version: "test",
}));

import { load } from "../src/routes/mimic/+layout.js";

const MIMIC: UserPower = "can-access-mimic";
const OTHER: UserPower = "can-import-quizzes";

function user(role: UserRole, powers: UserPower[]): AuthUser {
  return {
    id: `${role}-1`,
    email: null,
    nickname: null,
    avatar: null,
    role,
    powers,
    lobbyCode: null,
    emailVerified: true,
    sid: null,
  };
}

const run = (u: AuthUser) => () =>
  load({ parent: async () => ({ user: u }) } as never);

describe("/mimic in production gates on the power", () => {
  it("conceals the fixtures from an admin WITHOUT the power", async () => {
    await expect(run(user("admin", [OTHER]))()).rejects.toMatchObject({
      status: 404,
    });
  });

  it("admits a non-admin holding the power", async () => {
    await expect(run(user("member", [MIMIC]))()).resolves.toEqual({});
  });

  it("admits an admin who does hold it", async () => {
    await expect(run(user("admin", [MIMIC]))()).resolves.toEqual({});
  });

  for (const role of [
    "anonymous",
    "display",
    "member",
    "curator",
  ] as UserRole[]) {
    it(`conceals them from ${role} with no power — 404, not 403`, async () => {
      // Concealment, not refusal: a 403 would confirm the routes exist.
      await expect(run(user(role, []))()).rejects.toMatchObject({
        status: 404,
      });
    });
  }
});
