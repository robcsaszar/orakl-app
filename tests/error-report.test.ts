import { describe, expect, it } from "vitest";
import { buildReportMailto } from "../src/lib/error-report";

const base = {
  supportEmail: "help@from.orakl.quest",
  path: "/curator/create",
  message: "Internal server error",
  recentRoutes: ["/", "/join", "/curator/create"],
  userAgent: "test-agent/1.0",
  viewport: "1280x800",
  user: null,
};

describe("buildReportMailto", () => {
  it("targets the support email with a path-scoped subject", () => {
    const mailto = buildReportMailto(base);

    expect(mailto).toMatch(/^mailto:help@from\.orakl\.quest\?/);
    expect(mailto).toContain(encodeURIComponent("/curator/create"));
  });

  it("includes event id, user, and recent routes when present", () => {
    const mailto = buildReportMailto({
      ...base,
      eventId: "abc123",
      user: { nickname: "Ozy", role: "curator" },
    });
    const body = decodeURIComponent(mailto.split("body=")[1]);

    expect(body).toContain("Event ID: abc123");
    expect(body).toContain("User: Ozy (curator)");
    expect(body).toContain("Recent pages: / -> /join -> /curator/create");
  });

  it("omits event id and stack lines when absent", () => {
    const mailto = buildReportMailto(base);
    const body = decodeURIComponent(mailto.split("body=")[1]);

    expect(body).not.toContain("Event ID:");
    expect(body).not.toContain("Stack:");
  });

  it("labels an anonymous user when no nickname is set", () => {
    const mailto = buildReportMailto({
      ...base,
      user: { nickname: null, role: "member" },
    });
    const body = decodeURIComponent(mailto.split("body=")[1]);

    expect(body).toContain("User: anonymous (member)");
  });

  it("appends the stack trace when provided", () => {
    const mailto = buildReportMailto({ ...base, stack: "Error: boom\n  at x" });
    const body = decodeURIComponent(mailto.split("body=")[1]);

    expect(body).toContain("Stack:\nError: boom\n  at x");
  });
});
