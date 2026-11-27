using DrugPricing.Constants;
using DrugPricing.Data;
using DrugPricing.Data.Repositories;
using DrugPricing.Endpoints;

namespace DrugPricing.Services;

public class FdaProductService
{
  private readonly IFdaProductRepository _fdaProductRepo;
  private const int MIN_NAME_LENGTH = 5;

  public FdaProductService(IFdaProductRepository fdaProductRepo)
  {
    _fdaProductRepo = fdaProductRepo;
  }

  public bool ValidateNameSearch(string? name)
  {
    return (name?.Length >= MIN_NAME_LENGTH);
  }

  public async Task<List<string>> ListUniqueDosageFormNamesAsync()
  {
    var dosageFromNames = await _fdaProductRepo.ListUniqueDosageFormNamesAsync();

    return (dosageFromNames);
  }

  public async Task<List<string>> ListUniqueRouteNamesAsync()
  {
    var routeNames = await _fdaProductRepo.ListUniqueRouteNamesAsync();

    return (routeNames);
  }

  public async Task<LimitedRows<FdaProductSearchResult>> ListAdvancedSearchResultsAsync(
    AdvancedFdaSearchRequest request,
    CancellationToken cancellationToken = default
  )
  {
    var rows = await _fdaProductRepo.ListAdvancedSearchResultsAsync(
      request,
      SearchLimits.MaxRows,
      cancellationToken
    );

    return rows.Map(data => new FdaProductSearchResult { Data = data });
  }
}
