using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;

namespace DrugPricing.Endpoints;

public static class FdaProductEndpoints
{
  private const string AdvancedSearchRequiresAName = "No valid brand or generic name was provided.";
  private const string MissingAdvancedSearchRequest = "No search parameters were provided.";

  public static RouteGroupBuilder MapFdaProductEndpoints(this RouteGroupBuilder api)
  {
    var fdaProductGroup = api.MapGroup("/fda-products");

    // A POST, so the search terms travel in the body, never in a URL that a proxy, access log
    // or trace would record.
    fdaProductGroup.MapPost("/advanced-search", PostAdvancedSearch);

    return fdaProductGroup;
  }

  private static async Task<IResult> PostAdvancedSearch(
    [FromBody] AdvancedFdaSearchRequest? request,
    [FromServices] FdaProductService fdaProductService,
    CancellationToken cancellationToken
  )
  {
    if (request is null)
      return TypedResults.BadRequest(new { message = MissingAdvancedSearchRequest });

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
