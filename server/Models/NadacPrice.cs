using DrugPricing.Models.Enums;

namespace DrugPricing.Models;

public class NadacPrice
{
  public int Id { get; set; }

  public required string NdcDescription { get; set; }
  public required string Ndc { get; set; }
  public decimal NadacPerUnit { get; set; }
  public DateOnly EffectiveDate { get; set; }
  public NadacPricingUnit PricingUnit { get; set; }
  public string? PharmacyTypeIndicator { get; set; }
  public bool IsOtc { get; set; }
  public NadacExplanationCode[] ExplanationCode { get; set; } = [];
  public NadacClassification ClassificationForRateSetting { get; set; }

  public decimal? CorrespondingGenericNadacPerUnit { get; set; }
  public DateOnly? CorrespondingGenericEffectiveDate { get; set; }

  public required DateOnly AsOfDate { get; set; }

  public required string NdcDescriptionLower { get; set; }

  public DateTime LoadedAt { get; set; }

  public DateTime CreatedAt { get; set; }
}
