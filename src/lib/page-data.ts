import { error, redirect } from "@sveltejs/kit";
import { Either, Schema } from "effect";

/** Shown when the API answers 502, 503 or 504: the game server is down, not the page. */
export const API_UNAVAILABLE_MESSAGE =
  "The game server is unreachable. Try again in a moment.";

/** The API itself is down or unreachable, whatever the body says. */
export const isApiUnavailable = (status: number) =>
  status === 502 || status === 503 || status === 504;

/**
 * Throws the Kit error for a non-OK API answer with no body to read: a 502,
 * 503 or 504 becomes a 503 carrying `API_UNAVAILABLE_MESSAGE`; any other
 * status keeps itself with a generic message.
 */
export function failLoad(status: number): never {
  if (isApiUnavailable(status)) error(503, API_UNAVAILABLE_MESSAGE);
  error(status, "Failed to load");
}

/**
 * Unwraps a page load's response from the API: a 403 carrying `{ error:
 * "redirect", route }` (`gateRedirect`) becomes a Kit redirect to that route;
 * any non-OK status carrying `{ message }` (e.g. a 400 query validation
 * failure, or a 404) becomes a Kit error with that message; any other
 * non-OK status becomes a generic page error; otherwise the body is the
 * load's data, decoded by `schema` when given — a body that fails it is a
 * 502.
 */
export async function pageData<A, I>(
  res: Response,
  schema: Schema.Schema<A, I>,
): Promise<A>;
export async function pageData<T>(res: Response): Promise<T>;
export async function pageData(
  res: Response,
  schema?: Schema.Schema<unknown, unknown>,
): Promise<unknown> {
  if (!res.ok) {
    const body = (await res
      .clone()
      .json()
      .catch(() => ({}))) as {
      error?: string;
      route?: string;
      message?: string;
    };
    if (body.error === "redirect" && body.route) {
      redirect(303, body.route);
    }
    if (body.message && !isApiUnavailable(res.status)) {
      error(res.status, body.message);
    }
    failLoad(res.status);
  }
  const body: unknown = await res.json();
  if (!schema) return body;
  const decoded = Schema.decodeUnknownEither(schema)(body);
  if (Either.isLeft(decoded)) error(502, "Malformed response");
  return decoded.right;
}
