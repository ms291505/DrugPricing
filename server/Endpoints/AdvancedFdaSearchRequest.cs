namespace DrugPricing.Endpoints;

public record AdvancedFdaSearchRequest
{
  // FDA Product
  public string? ProprietaryName { get; init; }
  public string? NonProprietaryName { get; init; }
  public ICollection<string> DosageFormNames { get; init; } = [];
  public ICollection<string> RouteNames { get; init; } = [];
  public string? LabelerName { get; init; }
  public string? ProductNdc { get; init; }

  // FDA Package
  public bool IncludeSamplePackages { get; init; } = true;

  // NadacPrice
  public bool IncludeResultsWNoPrices { get; init; } = true;
  public DateOnly? PriceAsOfDateStart { get; init; }
  public DateOnly? PriceAsOfDateEnd { get; init; }
}
