import { describe, expect, it } from "vitest";
import { canPlay } from "../cloud-save";

describe("canPlay", () => {
  it("requires sign-in on the web", () => {
    expect(canPlay({ status: "out" })).toBe(false);
    expect(canPlay({ status: "loading" })).toBe(false);
  });

  it("lets signed-in players through", () => {
    expect(canPlay({ status: "in", email: "a@b.co" })).toBe(true);
  });

  it("never locks players out when sign-in is unavailable", () => {
    expect(canPlay({ status: "off" })).toBe(true);
  });
});
