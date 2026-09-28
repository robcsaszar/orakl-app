import { getContext, setContext } from "svelte";

const DISPLAY_MOCK = "orakl:displayMock";

export function setDisplayMock(): void {
  setContext(DISPLAY_MOCK, true);
}
export function isDisplayMock(): boolean {
  return getContext<boolean>(DISPLAY_MOCK) ?? false;
}
