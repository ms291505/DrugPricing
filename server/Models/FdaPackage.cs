namespace DrugPricing.Models;

public class FdaPackage
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

  public DateTime LoadedAt { get; set; }

  public DateTime CreatedAt { get; set; }

  public FdaProduct? FdaProduct { get; set; } = null!;
}
