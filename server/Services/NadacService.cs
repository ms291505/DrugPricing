using DrugPricing.Data.Repositories;

namespace DrugPricing.Services;

public class NadacService
{
  private readonly INadacRepository _nadacRepo;
  private const int MIN_NDC_DESCRIPTION_LENGTH = 5;
  private const int MIN_NDC_LENGTH = 5;

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

    var certainMinDate = asOfDates.LastOrDefault(d => d >= maxDate);
    if (certainMinDate == default)
    {
      certainMinDate = asOfDates.Last();
    }

    return certainMinDate;
  }

  public bool ValidateNdcDescription(string ndcDescription)
  {
    return (ndcDescription.Length >= MIN_NDC_DESCRIPTION_LENGTH);
  }

  public bool ValidateNdcn(string ndc)
  {
    return (ndc.Length >= MIN_NDC_LENGTH);
  }

  public async Task<NadacSearchResult> ListSearchResultsAsync(
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

    var data = await _nadacRepo.ListSearchResultsAsync(
      ndcDescription,
      ndc,
      certainMinDate,
      certainMaxDate
    );

    var result = new NadacSearchResult
    {
      Notices = notices,
      Predicates = predicates,
      Data = data,
    };

    return result;
  }
}
