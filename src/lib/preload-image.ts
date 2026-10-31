/** Images being fetched; held so the request is not dropped before it ends. */
const pending = new Set<HTMLImageElement>();

/**
 * Starts fetching `url` into the browser's cache, so a later `<img src={url}>`
 * paints without waiting on the network. No-op outside a browser.
 */
export function preloadImage(url: string | undefined): void {
  if (!url || typeof Image === "undefined") return;
  const img = new Image();
  const done = () => pending.delete(img);
  img.onload = done;
  img.onerror = done;
  pending.add(img);
  img.src = url;
}
