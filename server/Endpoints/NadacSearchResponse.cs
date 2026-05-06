using DrugPricing.Models;

namespace DrugPricing.Endpoints;

public record NadacPriceSearchResponse
{
  public List<Predicate> Predicates { get; init; } = [];
  public List<NadacPrice> Results { get; init; } = [];
  public List<string> Notices { get; init; } = [];

  public record Predicate
  {
    public required string Field { get; init; }
    public required string Operator { get; init; }
    public required string Value { get; init; }
  }
}
