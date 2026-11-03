/**
 * The wording of the toasts a search shows when its result comes back, e.g. "No products found",
 * "1 product found", "12 price changes flagged".
 *
 * @param noun - singular and plural
 */
export function countMessage(count: number, [singular, plural]: [string, string], verb: string): string {
  if (count === 0) return `No ${plural} ${verb}`;
  return `${count} ${count === 1 ? singular : plural} ${verb}`;
}
