namespace DrugPricing.Endpoints;

public record AdvancedFdaSearchRequest
{
  // FDA Product
  public string? ProprietaryName { get; init; }
  public string? NonProprietaryName { get; init; }
  public ICollection<string> DosageFormNames { get; init; } = [];
  public ICollection<string> RouteNames { get; init; } = [];
  /// <summary>
  /// Labeler codes (the first segment of a product NDC, 4 to 6 digits); a product matches when
  /// its NDC starts with one. Narrows a name search; never a search on its own.
  /// </summary>
  public ICollection<string> LabelerCodes { get; init; } = [];
  public string? ProductNdc { get; init; }

  // FDA Package
  public bool IncludeSamplePackages { get; init; } = true;

  // NadacPrice
  public bool IncludeResultsWNoPrices { get; init; } = true;
  public DateOnly? PriceAsOfDateStart { get; init; }
  public DateOnly? PriceAsOfDateEnd { get; init; }
}
