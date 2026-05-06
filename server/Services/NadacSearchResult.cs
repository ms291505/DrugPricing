using DrugPricing.Models;

namespace DrugPricing.Services;

public record NadacSearchResult
{
  public List<NadacPrice> Data { get; init; } = [];
  public List<string> Notices { get; init; } = [];
  public List<Predicate> Predicates { get; init; } = [];

  public record Predicate
  {
    public required string Field { get; init; }
    public required string Operator { get; init; }
    public required string Value { get; init; }
  }
}
