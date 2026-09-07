using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;

namespace DrugPricing.Endpoints;

public static class FdaProductEndpoints
{
  private const string NoSearchParamsErrorMessage = "No search parameters were provided.";
  private const string AdvancedSearchRequiresAName = "No valid brand or generic name was provided.";

  public static RouteGroupBuilder MapFdaProductEndpoints(this RouteGroupBuilder api)
  {
    var fdaProductGroup = api.MapGroup("/fda-products");

    fdaProductGroup.MapGet("/search", GetWithNameSearch);

    fdaProductGroup.MapGet("/advanced-search", GetWithAdvancedSearch);

    return fdaProductGroup;
  }

  private static async Task<IResult> GetWithNameSearch(
    [FromQuery] string proprietaryName,
    [FromServices] FdaProductService fdaProductService
  )
  {
    if (!fdaProductService.ValidateNameSearch(proprietaryName))
      return TypedResults.BadRequest(new { message = NoSearchParamsErrorMessage });

    var result = await fdaProductService.ListSearchResultsAsync(proprietaryName);

    return TypedResults.Ok(result);
  }

  private static async Task<IResult> GetWithAdvancedSearch(
    [FromBody] AdvancedFdaSearchRequest request,
    [FromServices] FdaProductService fdaProductService
  )
  {
    if (
      fdaProductService.ValidateNameSearch(request.ProprietaryName)
      && fdaProductService.ValidateNameSearch(request.NonProprietaryName) == false
    )
      return TypedResults.BadRequest(new { message = AdvancedSearchRequiresAName });

    return TypedResults.Ok();
  }
}
