import { FeatureFlagsDashboardSchema } from "@orakl/protocol";
import { error } from "@sveltejs/kit";
import { Either, Schema } from "effect";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch("/api/admin/feature-flags/dashboard");
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw error(res.status, body?.error ?? "Request failed");
  }
  const decoded = Schema.decodeUnknownEither(FeatureFlagsDashboardSchema)(
    await res.json(),
  );
  if (Either.isLeft(decoded)) throw error(502, "Malformed response");
  return decoded.right;
};
