// jsdom stand-in for SvelteKit's `$app/forms` — `enhance` is a no-op action
// so pages that progressively enhance a <form> render under Vitest.
export const enhance = () => ({ destroy() {} });
export const applyAction = async () => {};
export const deserialize = (s: string) => JSON.parse(s);
