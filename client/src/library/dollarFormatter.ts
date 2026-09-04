import type { RenderableText, TooltipValueType } from "recharts";

/**
 * Format RenderableText or TooltipValueTypes from `recharts` to formatted dollar string.
 *
 * @param value - RenderableText | TooltipValueType
 * @returns string
*/
export function dollarFormatter(value: RenderableText | TooltipValueType): string {
  const number = Number(value);

  if (Number.isNaN(number)) throw new Error("Invalid arguments");

  const formattedPrice = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number);

  return formattedPrice;
}
