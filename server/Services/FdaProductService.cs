using System.Threading.Tasks;
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

  public async Task<FdaProductSearchResult> ListSearchResultsAsync(string proprietaryName)
  {
    var data = await _fdaProductRepo.ListSearchResultsAsync(proprietaryName);

    var result = new FdaProductSearchResult { Data = data };

    return result;
  }

  public async Task<FdaProductSearchResult> ListAdvancedSearchResultsAsync(
    AdvancedFdaSearchRequest request
  )
  {
    var data = await _fdaProductRepo.ListAdvancedSearchResultsAsync(request);

    var result = new FdaProductSearchResult { Data = data };

    return result;
  }
}
