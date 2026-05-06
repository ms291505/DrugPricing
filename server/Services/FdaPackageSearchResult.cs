namespace DrugPricing.Services;

public record FdaPackageSearchResult
{
  public int Id { get; set; }

  public required string ProductId { get; set; }
  public required string ProductNdc { get; set; }
  public required string NdcPackageCode { get; set; }
  public required string PackageDescription { get; set; }
  public DateOnly StartMarketingDate { get; set; }
  public DateOnly? EndMarketingDate { get; set; }
  public string? NdcExcludeFlag { get; set; }
  public bool SamplePackage { get; set; }

  public required string NdcPackageCodeStripped { get; set; }

  public required string ProductTypeName { get; set; }
  public required string ProprietaryName { get; set; }
  public string? ProprietaryNameSuffix { get; set; }
  public ICollection<string> NonProprietaryName { get; set; } = [];
  public required string DosageFormName { get; set; }
  public ICollection<string> RouteName { get; set; } = [];
  public required string LabelerName { get; set; }
}
