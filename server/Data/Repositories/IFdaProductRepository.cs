using DrugPricing.Endpoints;

namespace DrugPricing.Data.Repositories;

public interface IFdaProductRepository
{
  Task<List<FdaProductDetail>> ListSearchResultsAsync(
    string proprietaryName,
    CancellationToken cancellationToken = default
  );

  Task<List<FdaProductDetail>> ListAdvancedSearchResultsAsync(
    AdvancedFdaSearchRequest request,
    CancellationToken cancellationToken = default
  );

  Task<List<string>> ListUniqueDosageFormNamesAsync();

  Task<List<string>> ListUniqueRouteNamesAsync();
}
