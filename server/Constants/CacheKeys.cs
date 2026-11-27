namespace DrugPricing.Constants;

public static class CacheKeys
{
  public const string DosageFormNames = "dosage-form-names";
  public const string RouteNames = "route-names";
  public const string FdaLabelerGroups = "fda-labeler-groups";
  public const string NadacAsOfDates = "nadac-as-of-dates";
  public const string NadacWeightLoss = "nadac-weight-loss";
  public const string NadacCancer = "nadac-cancer";
  public const string NadacBiologics = "nadac-biologics";

  public static string NadacSearch(
    string ndcDescription,
    string ndc,
    DateOnly minDate,
    DateOnly maxDate
  )
  {
    var cacheKey = $"nadac-search-{ndcDescription},{ndc},{minDate:yyyy-MM-dd},{maxDate:yyyy-MM-dd}";

    return cacheKey;
  }
}
