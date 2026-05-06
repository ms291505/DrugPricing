import type { NadacPrice, Drug } from "../types.ts"

export default function nadacPriceToDrug(nadacPrices: NadacPrice[]): Drug[] {
  const ndcs = [...new Set(nadacPrices.map(price => (price.ndc)))];

  const drugs: Drug[] = ndcs.map((ndc) => {
    const ndcDescription = nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";
    return { ndc: ndc, ndcDescription: ndcDescription ?? "" } as Drug;
  })

  return drugs;
}
