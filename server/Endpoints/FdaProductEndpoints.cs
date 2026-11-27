using System.Text.Json;
using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;

namespace DrugPricing.Endpoints;

public static class FdaProductEndpoints
{
  private const string AdvancedSearchRequiresAName = "No valid brand or generic name was provided.";
  private const string BadAdvancedSearchRequestJson =
    "Something went wrong sending the advanced search parameters.";

  private static readonly JsonSerializerOptions WebJsonOptions = new(JsonSerializerDefaults.Web);

  public static RouteGroupBuilder MapFdaProductEndpoints(this RouteGroupBuilder api)
  {
    var fdaProductGroup = api.MapGroup("/fda-products");

    fdaProductGroup.MapGet("/advanced-search", GetWithAdvancedSearch);

    return fdaProductGroup;
  }

  private static async Task<IResult> GetWithAdvancedSearch(
    [FromQuery] string jsonString,
    [FromServices] FdaProductService fdaProductService,
    CancellationToken cancellationToken
  )
  {
    var request = JsonSerializer.Deserialize<AdvancedFdaSearchRequest>(jsonString, WebJsonOptions);

    if (request is null)
      return TypedResults.BadRequest(new { message = BadAdvancedSearchRequestJson });

    if (
      !fdaProductService.ValidateNameSearch(request.ProprietaryName)
      && !fdaProductService.ValidateNameSearch(request.NonProprietaryName)
    )
      return TypedResults.BadRequest(new { message = AdvancedSearchRequiresAName });

    var result = await fdaProductService.ListAdvancedSearchResultsAsync(request, cancellationToken);

    if (!result.TryGetRows(out var searchResult))
      return SearchErrors.TooManyRows();

    return TypedResults.Ok(searchResult);
  }
}
