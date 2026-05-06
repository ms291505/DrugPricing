using DrugPricing.Data;
using DrugPricing.Data.Repositories;
using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrugPricing.Endpoints;

public static class NadacPriceEndpoints
{
  private const double TrigramsSimilarityThreshold = 0.3;
  private const string NoSearchParamsErrorMessage = "No search parameters were provided.";

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
    [FromServices] INadacRepository nadacRepo,
    [FromServices] NadacService nadacService
  )
  {
    List<NadacPriceSearchResponse.Predicate> predicates = [];

    var cleanDescriptionInput = ndcDescription?.ToLower().Trim() ?? "";

    var searchDescription = nadacService.ValidateNdcDescription(cleanDescriptionInput)
      ? cleanDescriptionInput
      : "";

    var searchNdc =
      string.IsNullOrWhiteSpace(ndc) ? ""
      : int.TryParse(ndc, out _) ? ndc
      : "";

    if (string.IsNullOrWhiteSpace(searchDescription) && string.IsNullOrWhiteSpace(searchNdc))
      return TypedResults.BadRequest(new { message = NoSearchParamsErrorMessage });

    var result = await nadacService.ListSearchResultsAsync(
      searchDescription,
      searchNdc,
      minDate,
      maxDate
    );

    return TypedResults.Ok(result);
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
      notices.Add("minDate replaced with the first availabile date in data.");

    predicates.Add(
      new NadacPriceSearchResponse.Predicate
      {
        Field = "minDate",
        Operator = ">=",
        Value = $"{certainMinDate:yyyy-MM-dd}",
      }
    );

    var certainMaxDate = await nadacService.SnapMaxSearchDateAsync(request.MaxDate);
    if (certainMaxDate == default)
      notices.Add("maxDate replaced with the last available date in the data.");

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
