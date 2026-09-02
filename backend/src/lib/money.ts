export type LineInput = {
  quantity: number;
  unitPriceCents: number;
  taxPercent: number;
};

export function lineTotalCents(line: LineInput): number {
  const net = Math.round(line.quantity * line.unitPriceCents);
  const tax = Math.round(net * (line.taxPercent / 100));
  return net + tax;
}

export function invoiceTotals(lines: LineInput[]) {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + Math.round(line.quantity * line.unitPriceCents),
    0,
  );
  const taxTotalCents = lines.reduce((sum, line) => {
    const net = Math.round(line.quantity * line.unitPriceCents);
    return sum + Math.round(net * (line.taxPercent / 100));
  }, 0);

  return {
    subtotalCents,
    taxTotalCents,
    totalCents: subtotalCents + taxTotalCents,
  };
}

export function euros(cents: number): number {
  return Math.round(cents) / 100;
}

export function parseEuroToCents(value: number): number {
  return Math.round(value * 100);
}
