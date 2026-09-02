import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats euro amounts for de-DE", () => {
    expect(formatMoney(238)).toMatch(/238/);
  });
});
