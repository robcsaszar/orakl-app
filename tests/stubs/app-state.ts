// jsdom stand-in for SvelteKit's `$app/state` — enough for components that read the current URL.
export const page = {
  url: new URL("http://localhost/"),
  params: {} as Record<string, string>,
  route: { id: null as string | null },
  status: 200,
  error: null,
  data: {} as Record<string, unknown>,
  form: null,
  state: {} as Record<string, unknown>,
};

export const navigating = {
  from: null,
  to: null,
  type: null,
  willUnload: false,
  delta: null,
  complete: null,
};

export const updated = { current: false, check: async () => false };
