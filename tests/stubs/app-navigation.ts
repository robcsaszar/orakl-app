// jsdom stand-in for SvelteKit's `$app/navigation` — no-op so components that
// import it resolve under Vitest. Tests spy via `vi.mock("$app/navigation")`.
export const goto = async (_url: string) => {};
export const invalidateAll = async () => {};
export const invalidate = async (_dep?: unknown) => {};
export const beforeNavigate = () => {};
export const afterNavigate = () => {};
export const preloadData = async () => {};
export const preloadCode = async () => {};
export const pushState = () => {};
export const replaceState = () => {};
