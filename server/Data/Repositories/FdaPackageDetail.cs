using DrugPricing.Models;

namespace DrugPricing.Data.Repositories;

public class FdaPackageDetail
{
  public int Id { get; init; }

  public required string NdcPackageCode { get; set; }
  public required string PackageDescription { get; set; }
  public DateOnly StartMarketingDate { get; set; }
  public DateOnly? EndMarketingDate { get; set; }
  public bool SamplePackage { get; set; }
  public required string NdcPackageCodeStripped { get; set; }

  public ICollection<NadacPrice> NadacPrices { get; init; } = [];
}
