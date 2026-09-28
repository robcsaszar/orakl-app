import "../sentry.client.config";
import * as Sentry from "@sentry/sveltekit";
import { handleErrorWithSentry } from "@sentry/sveltekit";

export const handleError = handleErrorWithSentry(
  ({ error, status }: { error: unknown; status: number }) => {
    if (status === 404) return { message: "Not found" };
    return {
      message: "Internal server error",
      eventId: Sentry.lastEventId(),
      ...(import.meta.env.DEV && error instanceof Error
        ? { stack: error.stack }
        : {}),
    };
  },
);
