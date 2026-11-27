namespace DrugPricing.Constants;

public static class SearchLimits
{
  /// <summary>
  /// The most rows a search may return: NADAC price rows, plus FDA packages for an FDA search
  /// (packages without prices still ship). A search past it is refused with a 422
  /// <c>too-many-rows</c> before anything loads. About 100 MB of JSON.
  /// </summary>
  public const int MaxRows = 200_000;

  /// <summary>
  /// The most distinct labeler codes one FDA search may send: ten of the largest labeler groups
  /// (83 codes, 2026-11). The client mirrors it as <c>MAX_LABELER_CODES</c>.
  /// </summary>
  public const int MaxLabelerCodes = 100;
}
