import type { RenderableText, TooltipValueType } from "recharts";

export function formatDollar(value: RenderableText | TooltipValueType): string;
export function formatDollar(value: RenderableText | TooltipValueType): string {
  const number = Number(value);
  const formattedPrice = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number);

  return formattedPrice;
}
