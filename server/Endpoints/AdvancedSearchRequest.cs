namespace DrugPricing.Endpoints;

public record AdvancedSearchRequest
{
  public required List<string> NdcDescriptions { get; init; } = [];
  public required List<string> Ndcs { get; init; } = [];
  public required DateOnly MinDate { get; init; }
  public required DateOnly MaxDate { get; init; }
}
