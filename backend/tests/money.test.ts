import { invoiceTotals, lineTotalCents, parseEuroToCents } from "../src/lib/money";

describe("money", () => {
  it("stores euros as integer cents", () => {
    expect(parseEuroToCents(19.99)).toBe(1999);
    expect(parseEuroToCents(19.999)).toBe(2000);
  });

  it("applies tax on the net line amount", () => {
    expect(
      lineTotalCents({ quantity: 2, unitPriceCents: 10000, taxPercent: 19 }),
    ).toBe(23800);
  });

  it("sums an invoice without floating-point drift", () => {
    const totals = invoiceTotals([
      { quantity: 1, unitPriceCents: 999, taxPercent: 19 },
      { quantity: 3, unitPriceCents: 2500, taxPercent: 0 },
    ]);
    expect(totals.subtotalCents).toBe(8499);
    expect(totals.taxTotalCents).toBe(190);
    expect(totals.totalCents).toBe(8689);
  });
});
