// jsdom stand-in for SvelteKit's `$app/environment` so server routes that read
// `dev` resolve under Vitest. Tests run as dev (non-Secure cookies).
export const dev = true;
export const browser = false;
export const building = false;
export const version = "test";
