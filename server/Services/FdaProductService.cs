using DrugPricing.Data.Repositories;

namespace DrugPricing.Services;

public class FdaProductService
{
  private readonly IFdaProductRepository _fdaProductRepo;
  private const int MIN_PROPRIETARY_NAME_LENGTH = 5;

  public FdaProductService(IFdaProductRepository fdaProductRepo)
  {
    _fdaProductRepo = fdaProductRepo;
  }

  public bool ValidateProprietaryNameSearch(string proprietaryName)
  {
    return (proprietaryName.Length >= MIN_PROPRIETARY_NAME_LENGTH);
  }

  public async Task<FdaProductSearchResult> ListSearchResultsAsync(string proprietaryName)
  {
    var data = await _fdaProductRepo.ListSearchResultsAsync(proprietaryName);

    var result = new FdaProductSearchResult { Data = data };

    return result;
  }
}
