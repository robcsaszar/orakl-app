/** Full page reload. A module so tests can mock it: jsdom's `location.reload`
 *  is unforgeable, so it cannot be stubbed in place. */
export function reload(): void {
  window.location.reload();
}
