namespace DrugPricing.Data.Repositories;

public class FdaProductDetail
{
  public int Id { get; init; }

  public required string ProductNdc { get; init; }
  public required string ProductTypeName { get; init; }
  public required string ProprietaryName { get; init; }
  public string? ProprietaryNameSuffix { get; init; }
  public ICollection<string> NonProprietaryName { get; init; } = [];
  public required string DosageFormName { get; init; }
  public ICollection<string> RouteName { get; init; } = [];
  public DateOnly StartMarketingDate { get; init; }
  public DateOnly? EndMarketingDate { get; init; }
  public required string MarketingCategoryName { get; init; }
  public required string LabelerName { get; init; }
  public ICollection<string> SubstanceName { get; init; } = [];
  public ICollection<string> StrengthNumber { get; init; } = [];
  public ICollection<string> StrengthUnit { get; init; } = [];
  public ICollection<string> PharmClasses { get; init; } = [];
  public string? DeaSchedule { get; init; }
  public DateOnly? ListingRecordCertifiedThrough { get; init; }

  public ICollection<FdaPackageDetail> FdaPackageDetails { get; init; } = [];
}
