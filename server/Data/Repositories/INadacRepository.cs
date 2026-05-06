using DrugPricing.Models;

namespace DrugPricing.Data.Repositories;

public interface INadacRepository
{
  /// <summary>
  /// Returns all distinct NADAC as-of dates in ascening order.
  /// </summary>
  Task<List<DateOnly>> ListAsOfDatesAsync(CancellationToken cancellationToken = default);

  /// <summary>
  /// Returns all NADAC prices within specified date range matching a search term.
  /// </summary>
  Task<List<NadacPrice>> ListSearchResultsAsync(
    string ndcDescription,
    string ndc,
    DateOnly minDate,
    DateOnly maxDate,
    CancellationToken cancellationToken = default
  );

  /// <summary>
  /// Returns all NADAC prices within a specified date range for each search term.
  /// </summary>
  Task<List<NadacPrice>> ListAdvancedSearchResultsAsync(
    List<string> ndcDescriptions,
    DateOnly minDate,
    DateOnly maxDate,
    CancellationToken cancellationToken = default
  );
}
