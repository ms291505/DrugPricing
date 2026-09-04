import type { NadacPrice, DrugDescription } from "./types.ts"

/**
 * Creates an array of the unique NDCs and their Descriptions.
 * 
 * @param nadacPrices: Array of NadacPrices
 * @returns Array<{ndc: string, ndcDescription: string}>
  */
export default function nadacPriceToDrug(nadacPrices: NadacPrice[]): DrugDescription[] {

  const ndcs = [...new Set(nadacPrices.map(price => (price.ndc)))];

  const drugs: DrugDescription[] = ndcs.map((ndc) => {
    const ndcDescription = nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";
    const description = { ndc: ndc, ndcDescription: ndcDescription };
    return description;
  })

  return drugs;
}
