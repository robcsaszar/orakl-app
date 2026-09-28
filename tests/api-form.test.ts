import type { ActionResult } from "@sveltejs/kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const applyAction = vi.fn(async () => {});
vi.mock("$app/forms", () => ({ applyAction }));

const { settleApiResult } = await import("../src/lib/api-form.js");

describe("settleApiResult", () => {
  beforeEach(() => applyAction.mockClear());

  it.each<ActionResult>([
    { type: "failure", status: 401, data: { error: "No." } },
    { type: "success", status: 200, data: { sent: true } },
  ])("applies a $type result to form after update", async (result) => {
    const order: string[] = [];
    const update = vi.fn(async () => {
      order.push("update");
    });
    applyAction.mockImplementationOnce(async () => {
      order.push("apply");
    });
    await settleApiResult(result, update);
    expect(order).toEqual(["update", "apply"]);
    expect(applyAction).toHaveBeenCalledWith(result);
  });

  it("leaves a redirect to update alone", async () => {
    const update = vi.fn(async () => {});
    await settleApiResult(
      { type: "redirect", status: 303, location: "/" },
      update,
    );
    expect(update).toHaveBeenCalledOnce();
    expect(applyAction).not.toHaveBeenCalled();
  });
});
