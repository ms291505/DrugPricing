using DrugPricing.Constants;
using DrugPricing.Data;
using DrugPricing.Data.Repositories;

namespace DrugPricing.Services;

public class NadacService
{
  private readonly INadacRepository _nadacRepo;
  private const int MIN_NDC_DESCRIPTION_LENGTH = 5;
  private const int MIN_NDC_LENGTH = 5;
  private const int MAX_NDC_LENGTH = 11;

  public NadacService(INadacRepository nadacRepo)
  {
    _nadacRepo = nadacRepo;
  }

  public async Task<DateOnly> SnapMinSearchDateAsync(DateOnly minDate)
  {
    var asOfDates = await _nadacRepo.ListAsOfDatesAsync();

    var certainMinDate = asOfDates.LastOrDefault(d => d <= minDate);
    if (certainMinDate == default)
    {
      certainMinDate = asOfDates.First();
    }

    return certainMinDate;
  }

  public async Task<DateOnly> SnapMaxSearchDateAsync(DateOnly maxDate)
  {
    var asOfDates = await _nadacRepo.ListAsOfDatesAsync();

    var certainMaxDate = asOfDates.FirstOrDefault(d => d >= maxDate);
    if (certainMaxDate == default)
    {
      certainMaxDate = asOfDates.Last();
    }

    return certainMaxDate;
  }

  public async Task<(DateOnly firstDate, DateOnly lastDate)> AsOfDateRangeAsync()
  {
    var asOfDates = await _nadacRepo.ListAsOfDatesAsync();

    return (asOfDates.Min(), asOfDates.Max());
  }

  public bool ValidateNdcDescription(string ndcDescription)
  {
    return (ndcDescription.Length >= MIN_NDC_DESCRIPTION_LENGTH);
  }

  /// <summary>
  /// The stored form of an NDC search without dashes, as the client's <c>toStoredNadacNdc</c>
  /// makes it: trimmed, without leading zeros. NADAC stores NDCs that way.
  /// </summary>
  public string NormalizeNdc(string ndc)
  {
    return ndc.Trim().TrimStart('0');
  }

  /// <summary>Checks a normalized NDC (<see cref="NormalizeNdc"/>): 5 to 11 ASCII digits.</summary>
  public bool ValidateNdc(string normalizedNdc)
  {
    return normalizedNdc.Length >= MIN_NDC_LENGTH
      && normalizedNdc.Length <= MAX_NDC_LENGTH
      && normalizedNdc.All(char.IsAsciiDigit);
  }

  public async Task<LimitedRows<NadacSearchResult>> ListSearchResultsAsync(
    string ndcDescription,
    string ndc,
    DateOnly minDate,
    DateOnly maxDate,
    CancellationToken cancellationToken = default
  )
  {
    List<string> notices = [];
    List<NadacSearchResult.Predicate> predicates = [];

    predicates.Add(
      new NadacSearchResult.Predicate
      {
        Field = "ndcDescription",
        Operator = "Like",
        Value = ndcDescription,
      }
    );

    predicates.Add(
      new NadacSearchResult.Predicate
      {
        Field = "ndc",
        Operator = "Like",
        Value = ndc,
      }
    );

    var certainMinDate = await SnapMinSearchDateAsync(minDate);
    if (certainMinDate > minDate)
      notices.Add("minDate replaced with the first availabile date in data.");

    predicates.Add(
      new NadacSearchResult.Predicate
      {
        Field = "minDate",
        Operator = ">=",
        Value = $"{certainMinDate:yyyy-MM-dd}",
      }
    );

    var certainMaxDate = await SnapMaxSearchDateAsync(maxDate);
    if (certainMaxDate == default)
      notices.Add("maxDate replaced with the last available date in the data.");

    predicates.Add(
      new NadacSearchResult.Predicate
      {
        Field = "maxDate",
        Operator = "<=",
        Value = $"{certainMaxDate:yyyy-MM-dd}",
      }
    );

    var rows = await _nadacRepo.ListSearchResultsAsync(
      ndcDescription,
      ndc,
      certainMinDate,
      certainMaxDate,
      SearchLimits.MaxRows,
      cancellationToken
    );

    return rows.Map(data => new NadacSearchResult
    {
      Notices = notices,
      Predicates = predicates,
      Data = data,
    });
  }
}
