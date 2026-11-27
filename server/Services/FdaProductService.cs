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

  /// <summary>
  /// Whether every code is 4 to 6 digits (FDA's planned 12-digit NDC gives labelers 6) and there
  /// are at most <see cref="SearchLimits.MaxLabelerCodes"/> distinct ones. Digits only is what
  /// lets the repository build LIKE patterns from them without escaping.
  /// </summary>
  public bool ValidateLabelerCodes(ICollection<string>? codes)
  {
    if (codes is null)
      return true;
    return codes.All(code => code.Length is >= 4 and <= 6 && code.All(char.IsAsciiDigit))
      && codes.Distinct().Count() <= SearchLimits.MaxLabelerCodes;
  }

  /// <summary>Every labeler, grouped from the cached rows (<see cref="LabelerGroups"/>).</summary>
  public async Task<List<LabelerGroup>> ListLabelerGroupsAsync(
    CancellationToken cancellationToken = default
  )
  {
    var rows = await _fdaProductRepo.ListLabelerRowsAsync(cancellationToken);
    return LabelerGroups.Group(rows);
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
