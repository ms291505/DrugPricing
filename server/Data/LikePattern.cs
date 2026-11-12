namespace DrugPricing.Data;

/// <summary>
/// Builds <c>LIKE</c>/<c>ILIKE</c> patterns from user input. Every <c>EF.Functions.ILike</c> on a
/// search term goes through it, with <see cref="EscapeCharacter"/> as the escape argument, so
/// <c>%</c>, <c>_</c> and <c>\</c> in a term match themselves: a term of five underscores would
/// otherwise pass the minimum length and match every row.
/// </summary>
public static class LikePattern
{
  public const string EscapeCharacter = "\\";

  /// <summary>A pattern matching values that contain <paramref name="term"/> literally.</summary>
  public static string Contains(string term) => $"%{Escape(term)}%";

  private static string Escape(string term) => term
    .Replace(EscapeCharacter, EscapeCharacter + EscapeCharacter)
    .Replace("%", EscapeCharacter + "%")
    .Replace("_", EscapeCharacter + "_");
}
