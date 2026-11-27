namespace DrugPricing.Data.Repositories;

/// <summary>
/// One labeler spelling on one labeler code, over active products: what
/// <see cref="LabelerGroups"/> groups into labelers.
/// </summary>
public record LabelerRow
{
  public required string LabelerName { get; init; }

  /// <summary>The first segment of the product NDC.</summary>
  public required string LabelerCode { get; init; }

  public int ProductCount { get; init; }

  /// <summary>Has a prescription (not OTC) product.</summary>
  public bool HasRx { get; init; }

  /// <summary>Has an active package NADAC has priced (its NDC is in <c>DrugPackages</c>).</summary>
  public bool HasPrices { get; init; }

  /// <summary>Has a prescription product with a priced package.</summary>
  public bool HasRxPrices { get; init; }
}
