using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;

namespace DrugPricing.Endpoints;

public static class FdaProductEndpoints
{
  private const string NoSearchParamsErrorMessage = "No search parameters were provided.";

  public static RouteGroupBuilder MapFdaProductEndpoints(this RouteGroupBuilder api)
  {
    var fdaProductGroup = api.MapGroup("/fda-products");

    fdaProductGroup.MapGet("/search", GetWithSearch);

    return fdaProductGroup;
  }

  private static async Task<IResult> GetWithSearch(
    [FromQuery] string proprietaryName,
    [FromServices] FdaProductService fdaProductService
  )
  {
    if (!fdaProductService.ValidateProprietyNameSearch(proprietaryName))
      return TypedResults.BadRequest(new { message = NoSearchParamsErrorMessage });

    var result = await fdaProductService.ListSearchResultsAsync(proprietaryName);

    return TypedResults.Ok(result);
  }
}
