import { describe, expect, it } from "vitest";
import { registerHeaderActions } from "../src/lib/header-action-state.svelte.js";

describe("registerHeaderActions", () => {
  it("assigns the given callbacks onto slot.actions", () => {
    const slot = { actions: { onFoo: null as (() => void) | null } };
    const onFoo = () => {};

    registerHeaderActions(slot, { onFoo });

    expect(slot.actions.onFoo).toBe(onFoo);
  });

  it("cleanup nulls the callback it registered", () => {
    const slot = { actions: { onFoo: null as (() => void) | null } };
    const onFoo = () => {};

    const cleanup = registerHeaderActions(slot, { onFoo });
    cleanup();

    expect(slot.actions.onFoo).toBeNull();
  });

  it("cleanup does not clear a later occupant's callback for the same key", () => {
    const slot = { actions: { onFoo: null as (() => void) | null } };
    const first = () => {};
    const second = () => {};

    const cleanupFirst = registerHeaderActions(slot, { onFoo: first });
    // A second registration overwrites the slot before the first's cleanup runs
    // (e.g. a new route/component claims the same header-action slot).
    registerHeaderActions(slot, { onFoo: second });

    cleanupFirst();

    expect(slot.actions.onFoo).toBe(second);
  });

  it("only clears keys it registered, leaving other keys untouched", () => {
    const slot = {
      actions: {
        onFoo: null as (() => void) | null,
        onBar: null as (() => void) | null,
      },
    };
    const onBar = () => {};
    slot.actions.onBar = onBar;

    const cleanup = registerHeaderActions(slot, { onFoo: () => {} });
    cleanup();

    expect(slot.actions.onFoo).toBeNull();
    expect(slot.actions.onBar).toBe(onBar);
  });
});
