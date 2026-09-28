export type ErrorReportContext = {
  supportEmail: string;
  path: string;
  message: string;
  eventId?: string;
  stack?: string;
  recentRoutes: string[];
  userAgent: string;
  viewport: string;
  user: { nickname: string | null; role: string } | null;
};

/** Pure mailto: builder — no DOM/global access so it's directly testable.
 *  Caller (the 500 page) supplies userAgent/viewport/recentRoutes already
 *  gathered from the browser. */
export function buildReportMailto(ctx: ErrorReportContext): string {
  const lines = [
    `Path: ${ctx.path}`,
    `Message: ${ctx.message}`,
    ctx.eventId ? `Event ID: ${ctx.eventId}` : null,
    ctx.user
      ? `User: ${ctx.user.nickname ?? "anonymous"} (${ctx.user.role})`
      : null,
    ctx.recentRoutes.length
      ? `Recent pages: ${ctx.recentRoutes.join(" -> ")}`
      : null,
    `Browser: ${ctx.userAgent}`,
    `Viewport: ${ctx.viewport}`,
    ctx.stack ? `\nStack:\n${ctx.stack}` : null,
  ].filter((line): line is string => line !== null);

  const subject = `[Orakl] Error report — ${ctx.path}`;
  const body = lines.join("\n");
  return `mailto:${ctx.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
