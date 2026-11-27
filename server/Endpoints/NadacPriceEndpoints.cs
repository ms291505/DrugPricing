using DrugPricing.Data;
using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrugPricing.Endpoints;

public static class NadacPriceEndpoints
{
  private const double TrigramsSimilarityThreshold = 0.3;
  private const string NoSearchParamsErrorMessage = "No search parameters were provided.";
  private const string InvalidNdcErrorMessage =
    "An NDC search needs at least 5 digits, not counting leading zeros.";

  public static RouteGroupBuilder MapNadacEndpoints(this RouteGroupBuilder api)
  {
    var nadacGroup = api.MapGroup("/nadac-prices");

    nadacGroup.MapGet("/{nadacPriceId:int}", GetById);

    nadacGroup.MapGet("/search", GetWithSearch);

    nadacGroup.MapGet("/advanced-search", GetWithAdvancedSearch);

    return nadacGroup;
  }

  private static async Task<IResult> GetById(int nadacPriceId, [FromServices] DrugPricingContext db)
  {
    var nadacPrice = await db
      .NadacPrices.AsNoTracking()
      .SingleOrDefaultAsync(p => p.Id == nadacPriceId);

    if (nadacPrice == null)
      return TypedResults.NotFound();

    return TypedResults.Ok(nadacPrice);
  }

  private static async Task<IResult> GetWithSearch(
    [FromQuery] string? ndcDescription,
    [FromQuery] string? ndc,
    [FromQuery] DateOnly minDate,
    [FromQuery] DateOnly maxDate,
    [FromServices] NadacService nadacService,
    CancellationToken cancellationToken
  )
  {
    List<NadacPriceSearchResponse.Predicate> predicates = [];

    var cleanDescriptionInput = ndcDescription?.ToLower().Trim() ?? "";

    var searchDescription = nadacService.ValidateNdcDescription(cleanDescriptionInput)
      ? cleanDescriptionInput
      : "";

    // A given NDC that isn't valid is refused, not dropped. Searched in its stored form, so
    // 00003089321 finds 3089321.
    var searchNdc = "";
    if (!string.IsNullOrWhiteSpace(ndc))
    {
      searchNdc = nadacService.NormalizeNdc(ndc);
      if (!nadacService.ValidateNdc(searchNdc))
        return TypedResults.BadRequest(new { message = InvalidNdcErrorMessage });
    }

    if (string.IsNullOrWhiteSpace(searchDescription) && string.IsNullOrWhiteSpace(searchNdc))
      return TypedResults.BadRequest(new { message = NoSearchParamsErrorMessage });

    var result = await nadacService.ListSearchResultsAsync(
      searchDescription,
      searchNdc,
      minDate,
      maxDate,
      cancellationToken
    );

    if (!result.TryGetRows(out var searchResult))
      return SearchErrors.TooManyRows();

    return TypedResults.Ok(searchResult);
  }

  public static async Task<IResult> GetWithAdvancedSearch(
    [FromBody] AdvancedSearchRequest request,
    [FromServices] NadacService nadacService
  )
  {
    List<string> notices = [];
    List<NadacPriceSearchResponse.Predicate> predicates = [];

    if (request.NdcDescriptions.Count == 0 && request.Ndcs.Count == 0)
      return TypedResults.BadRequest(new { message = "No search terms included." });

    var certainMinDate = await nadacService.SnapMinSearchDateAsync(request.MinDate);
    if (certainMinDate != request.MinDate)
      notices.Add("minDate snapped to the nearest available as-of date.");

    predicates.Add(
      new NadacPriceSearchResponse.Predicate
      {
        Field = "minDate",
        Operator = ">=",
        Value = $"{certainMinDate:yyyy-MM-dd}",
      }
    );

    var certainMaxDate = await nadacService.SnapMaxSearchDateAsync(request.MaxDate);
    if (certainMaxDate != request.MaxDate)
      notices.Add("maxDate snapped to the nearest available as-of date.");

    predicates.Add(
      new NadacPriceSearchResponse.Predicate
      {
        Field = "maxDate",
        Operator = "<=",
        Value = $"{certainMaxDate:yyyy-MM-dd}",
      }
    );

    //var nadacPrices = nadacService.

    return TypedResults.Ok();
  }
}
