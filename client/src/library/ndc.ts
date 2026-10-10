// 11-digit NDC segment widths: labeler-product-package.
const SEGMENT_WIDTHS = [5, 4, 2];

/**
 * Converts NDC search input to the form NADAC stores: the 11-digit (5-4-2) code with its
 * leading zeros dropped, e.g. "3089321" for 00003-0893-21.
 *
 * Dashed input is padded per segment first, because FDA codes come as 4-4-2, 5-3-2, or 5-4-1
 * and the dashes are the only way to know which segment is short: "11788-037-60" becomes
 * "11788003760". Two segments (labeler-product) are padded the same way for partial searches.
 * Input without dashes is taken as already 11-digit (or a fragment of one).
 */
export function toStoredNadacNdc(input: string): string {
  const segments = input.trim().split("-");

  const canPad = (segments.length === 2 || segments.length === 3) &&
    segments.every((segment, i) => /^\d+$/.test(segment) && segment.length <= SEGMENT_WIDTHS[i]);

  const digits = canPad
    ? segments.map((segment, i) => segment.padStart(SEGMENT_WIDTHS[i], "0")).join("")
    : input.replace(/\D/g, "");

  return digits.replace(/^0+/, "");
}
