using DrugPricing.Data.Repositories;

namespace DrugPricing.Services;

public class FdaProductSearchResult
{
  public required List<FdaProductDetail> Data { get; init; } = [];
}
