// Vitest stand-in for SvelteKit's `$env/dynamic/private`: the process env,
// which tests set directly.
export const env: Record<string, string | undefined> = process.env;
