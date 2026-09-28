const MAX_LABEL_LENGTH = 80;

export interface SourceLink {
  url: string;
  label: string;
  fullLabel: string;
}

interface SourceLike {
  url: string;
  label?: string | null;
}

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Derives the display link for a question source. Only https URLs render as
 * a link — a stored row is not re-validated on read, so a non-https URL
 * yields null rather than a broken link.
 */
export function toSourceLink(
  source: SourceLike | null | undefined,
): SourceLink | null {
  if (!source || !isHttpsUrl(source.url)) return null;

  let hostname: string;
  try {
    hostname = new URL(source.url).hostname;
  } catch {
    hostname = source.url;
  }

  // A stored label may be blank — the row is not revalidated on read — so
  // fall back to the hostname rather than render a bare "Source:".
  const fullLabel = source.label?.trim() || hostname;
  const label =
    fullLabel.length > MAX_LABEL_LENGTH
      ? `${fullLabel.slice(0, MAX_LABEL_LENGTH)}…`
      : fullLabel;

  return { url: source.url, label, fullLabel };
}
