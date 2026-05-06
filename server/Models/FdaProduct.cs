namespace DrugPricing.Models;

public class FdaProduct
{
  public int Id { get; set; }

  public required string ProductId { get; set; }
  public required string ProductNdc { get; set; }
  public required string ProductTypeName { get; set; }
  public required string ProprietaryName { get; set; }
  public string? ProprietaryNameSuffix { get; set; }
  public ICollection<string> NonProprietaryName { get; set; } = [];
  public required string DosageFormName { get; set; }
  public ICollection<string> RouteName { get; set; } = [];
  public DateOnly StartMarketingDate { get; set; }
  public DateOnly? EndMarketingDate { get; set; }
  public required string MarketingCategoryName { get; set; }
  public string? ApplicationNumber { get; set; }
  public required string LabelerName { get; set; }
  public ICollection<string> SubstanceName { get; set; } = [];
  public ICollection<string> StrengthNumber { get; set; } = [];
  public ICollection<string> StrengthUnit { get; set; } = [];
  public ICollection<string> PharmClasses { get; set; } = [];
  public string? DeaSchedule { get; set; }
  public string? NdcExcludeFlag { get; set; }
  public DateOnly? ListingRecordCertifiedThrough { get; set; }

  public ICollection<FdaPackage> FdaPackages { get; set; } = [];

  public DateTime LoadedAt { get; set; }

  public DateTime CreatedAt { get; set; }
}
