import type { FdaProductDetail } from "./types";

type Strength = Pick<FdaProductDetail, "strengthNumber" | "strengthUnit">;

/** Strength text shared by FDA product and package columns, including multi-ingredient drugs. */
export function formatStrength(product: Strength): string {
  return product.strengthNumber.map((strength, i) => {
    const unit = product.strengthUnit[i];
    return unit ? `${strength} ${unit}` : strength;
  }).join(", ");
}

/** What the Strength filter lists for a product without one (2,508 active products, 2026-11). */
export const STRENGTH_NOT_LISTED = "Not listed";

/** A product's value in the Strength filter: its formatted strength, or "Not listed". */
export const strengthLabel = (product: Strength): string => formatStrength(product) || STRENGTH_NOT_LISTED;

/** The first ingredient's number and unit, and the rest of the label. */
function parseStrength(label: string): { number: number, unit: string, rest: string } {
  const [first, ...rest] = label.split(", ");
  const match = /^(\d*\.?\d+)\s*(.*)$/.exec(first);
  return {
    number: match ? Number(match[1]) : NaN,
    unit: match ? match[2] : first,
    rest: rest.join(", "),
  };
}

const compareRest = (a: string, b: string) =>
  a === b ? 0 : a === "" ? -1 : b === "" ? 1 : compareStrength(a, b);

/**
 * Orders strength labels (`strengthLabel`) for the Strength filter: by the first ingredient's
 * number as a number (500 before 1000), then its unit, then the other ingredients the same way
 * (a single ingredient first). Labels without a leading number follow those with one, and
 * "Not listed" comes last.
 */
export function compareStrength(a: string, b: string): number {
  if (a === b) return 0;
  if (a === STRENGTH_NOT_LISTED) return 1;
  if (b === STRENGTH_NOT_LISTED) return -1;
  const x = parseStrength(a), y = parseStrength(b);
  const xNumber = !Number.isNaN(x.number), yNumber = !Number.isNaN(y.number);
  if (xNumber !== yNumber) return xNumber ? -1 : 1;
  return (xNumber ? x.number - y.number : 0)
    || x.unit.localeCompare(y.unit)
    || compareRest(x.rest, y.rest)
    // ".5 mg/1" and "0.5 mg/1" are the same strength written two ways: keep the order stable.
    || (a < b ? -1 : 1);
}
