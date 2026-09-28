/**
 * Renders a post-answer note's emphasis as safe HTML.
 *
 * Recognises paired `**bold**`/`__bold__` and `*italic*`/`_italic_` and emits
 * `<strong>`/`<em>` for them. Everything else — including raw HTML, markdown
 * link syntax, and bare URLs — is HTML-escaped and rendered as literal text.
 * There is no code path that emits an anchor tag or any attribute: links are
 * impossible by construction, not stripped afterwards.
 *
 * Delimiters must hug their content, so `2 * 2 = 4` and `snake_case_name`
 * render as written.
 *
 * Nesting supports one level (e.g. `**bold with *italic* inside**`); a
 * second level of nesting is not parsed and renders literally.
 */

const ESCAPE_RE = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text: string): string {
  return text.replace(ESCAPE_RE, (char) => ESCAPE_MAP[char] ?? char);
}

/**
 * Matches a paired `**...**`, `__...__`, `*...*`, or `_..._` span, non-greedy
 * so a bold span's content can hold one nested pair of italic delimiters.
 *
 * A delimiter must hug its content: an opener is not followed by whitespace
 * and a closer is not preceded by it, so arithmetic like `2 * 2 = 4` stays
 * literal. Underscore spans additionally need a non-word character on the
 * outside, which keeps `snake_case_name` intact.
 */
const SPAN_RE =
  /\*\*(?!\s)(.+?)(?<!\s)\*\*|(?<![A-Za-z0-9])__(?!\s)(.+?)(?<!\s)__(?![A-Za-z0-9])|\*(?!\s)(.+?)(?<!\s)\*|(?<![A-Za-z0-9])_(?!\s)(.+?)(?<!\s)_(?![A-Za-z0-9])/g;

/** Matches a paired `*...*`/`_..._` span for the nested level inside bold,
 *  under the same flanking rules as {@link SPAN_RE}. */
const NESTED_ITALIC_RE =
  /\*(?!\s)(.+?)(?<!\s)\*|(?<![A-Za-z0-9])_(?!\s)(.+?)(?<!\s)_(?![A-Za-z0-9])/g;

function renderNestedItalic(text: string): string {
  let out = "";
  let lastIndex = 0;

  for (const match of text.matchAll(NESTED_ITALIC_RE)) {
    const index = match.index ?? 0;
    out += escapeHtml(text.slice(lastIndex, index));
    const inner = match[1] ?? match[2] ?? "";
    out += `<em>${escapeHtml(inner)}</em>`;
    lastIndex = index + match[0].length;
  }

  out += escapeHtml(text.slice(lastIndex));
  return out;
}

/** Renders a note string's emphasis as safe HTML (`<strong>`/`<em>` only). */
export function renderNoteHtml(note: string): string {
  let out = "";
  let lastIndex = 0;

  for (const match of note.matchAll(SPAN_RE)) {
    const index = match.index ?? 0;
    out += escapeHtml(note.slice(lastIndex, index));

    const [, boldStar, boldUnderscore, italicStar, italicUnderscore] = match;
    if (boldStar !== undefined) {
      out += `<strong>${renderNestedItalic(boldStar)}</strong>`;
    } else if (boldUnderscore !== undefined) {
      out += `<strong>${renderNestedItalic(boldUnderscore)}</strong>`;
    } else if (italicStar !== undefined) {
      out += `<em>${escapeHtml(italicStar)}</em>`;
    } else if (italicUnderscore !== undefined) {
      out += `<em>${escapeHtml(italicUnderscore)}</em>`;
    }

    lastIndex = index + match[0].length;
  }

  out += escapeHtml(note.slice(lastIndex));
  return out;
}
