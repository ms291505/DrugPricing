using System.Globalization;
using DrugPricing.Constants;

namespace DrugPricing.Endpoints;

/// <summary>The search refusals both search endpoints send, so they keep one shape.</summary>
public static class SearchErrors
{
  public const string TooManyRowsCode = "too-many-rows";

  /// <summary>
  /// 422 for a search matching more than <see cref="SearchLimits.MaxRows"/> rows. The client tells
  /// it apart from other errors by <c>code</c> and shows <c>message</c> above the results.
  /// </summary>
  public static IResult TooManyRows() =>
    TypedResults.UnprocessableEntity(
      new
      {
        code = TooManyRowsCode,
        message = string.Create(
          CultureInfo.InvariantCulture,
          $"This search matches more than {SearchLimits.MaxRows:N0} results, too many to show. Make the search terms more specific or shorten the Dates."
        ),
        limit = SearchLimits.MaxRows,
      }
    );
}
