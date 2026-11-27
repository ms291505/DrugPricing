using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;

namespace DrugPricing.Endpoints;

public static class FdaProductEndpoints
{
  private const string AdvancedSearchRequiresTerms =
    "No valid brand name, generic name, or labeler was provided.";
  private const string BadLabelerCodes = "The labelers sent can't be searched.";
  private const string MissingAdvancedSearchRequest = "No search parameters were provided.";

  public static RouteGroupBuilder MapFdaProductEndpoints(this RouteGroupBuilder api)
  {
    var fdaProductGroup = api.MapGroup("/fda-products");

    // A POST, so the search terms travel in the body, never in a URL that a proxy, access log
    // or trace would record.
    fdaProductGroup.MapPost("/advanced-search", PostAdvancedSearch);
    // A GET: the whole list, with nothing the user typed in it.
    fdaProductGroup.MapGet("/labelers", GetLabelers);

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

    if (!fdaProductService.ValidateLabelerCodes(request.LabelerCodes))
      return TypedResults.BadRequest(new { message = BadLabelerCodes });

    if (
      !fdaProductService.ValidateNameSearch(request.ProprietaryName)
      && !fdaProductService.ValidateNameSearch(request.NonProprietaryName)
      && !(request.LabelerCodes?.Count > 0)
    )
      return TypedResults.BadRequest(new { message = AdvancedSearchRequiresTerms });

    var result = await fdaProductService.ListAdvancedSearchResultsAsync(request, cancellationToken);

    if (!result.TryGetRows(out var searchResult))
      return SearchErrors.TooManyRows();

    return TypedResults.Ok(searchResult);
  }

  /// <summary>Every labeler group, for the client's Labeler field to match against.</summary>
  private static async Task<IResult> GetLabelers(
    [FromServices] FdaProductService fdaProductService,
    CancellationToken cancellationToken
  )
  {
    var groups = await fdaProductService.ListLabelerGroupsAsync(cancellationToken);
    return TypedResults.Ok(new { data = groups });
  }
}
