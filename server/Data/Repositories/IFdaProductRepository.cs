using DrugPricing.Endpoints;

namespace DrugPricing.Data.Repositories;

public interface IFdaProductRepository
{
  /// <summary>
  /// Returns the products matching the search, with their packages and prices in its dates, or
  /// "too many rows" without loading any when packages and prices together pass
  /// <paramref name="limit"/>.
  /// </summary>
  Task<LimitedRows<List<FdaProductDetail>>> ListAdvancedSearchResultsAsync(
    AdvancedFdaSearchRequest request,
    int limit,
    CancellationToken cancellationToken = default
  );

  /// <summary>
  /// Each labeler spelling on each labeler code over active products, with its product count and
  /// flags. Cached for <see cref="Constants.CacheDuration.Reference"/>.
  /// </summary>
  Task<List<LabelerRow>> ListLabelerRowsAsync(CancellationToken cancellationToken = default);

  Task<List<string>> ListUniqueDosageFormNamesAsync();

  Task<List<string>> ListUniqueRouteNamesAsync();
}
