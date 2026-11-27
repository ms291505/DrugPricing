using System.Text.Json;
using DrugPricing.Services;
using Microsoft.AspNetCore.Mvc;

namespace DrugPricing.Endpoints;

public static class FdaProductEndpoints
{
  private const string AdvancedSearchRequiresTerms =
    "No valid brand name, generic name, or labeler was provided.";
  private const string BadLabelerCodes = "The labelers sent can't be searched.";
  private const string BadAdvancedSearchRequestJson =
    "Something went wrong sending the advanced search parameters.";

  private static readonly JsonSerializerOptions WebJsonOptions = new(JsonSerializerDefaults.Web);

  public static RouteGroupBuilder MapFdaProductEndpoints(this RouteGroupBuilder api)
  {
    var fdaProductGroup = api.MapGroup("/fda-products");

    fdaProductGroup.MapGet("/advanced-search", GetWithAdvancedSearch);
    fdaProductGroup.MapGet("/labelers", GetLabelers);

    return fdaProductGroup;
  }

  private static async Task<IResult> GetWithAdvancedSearch(
    [FromQuery] string jsonString,
    [FromServices] FdaProductService fdaProductService,
    CancellationToken cancellationToken
  )
  {
    Console.WriteLine(jsonString);

    var request = JsonSerializer.Deserialize<AdvancedFdaSearchRequest>(jsonString, WebJsonOptions);

    Console.WriteLine(request);

    if (request is null)
      return TypedResults.BadRequest(new { message = BadAdvancedSearchRequestJson });

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
