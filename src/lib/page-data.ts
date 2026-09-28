import { error, redirect } from "@sveltejs/kit";
import { Either, Schema } from "effect";

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
    if (body.message) error(res.status, body.message);
    throw error(res.status, "Failed to load");
  }
  const body: unknown = await res.json();
  if (!schema) return body;
  const decoded = Schema.decodeUnknownEither(schema)(body);
  if (Either.isLeft(decoded)) error(502, "Malformed response");
  return decoded.right;
}
