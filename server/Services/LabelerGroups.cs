using System.Text.RegularExpressions;
using DrugPricing.Data.Repositories;

namespace DrugPricing.Services;

/// <summary>
/// A labeler: the spellings and labeler codes of one company, which FDA lists under many
/// spellings (Dr. Reddy's has 43 on 4 codes). The client matches typed text against
/// <see cref="Name"/> and <see cref="Spellings"/> and searches by <see cref="Codes"/>.
/// </summary>
public record LabelerGroup
{
  /// <summary>The spelling with the most products.</summary>
  public required string Name { get; init; }

  /// <summary>Sorted.</summary>
  public required List<string> Codes { get; init; }

  /// <summary>
  /// The group's other spellings, one per normalized form other than <see cref="Name"/>'s (the
  /// one with the most products), so the client can match them and say "Listed as ...".
  /// </summary>
  public required List<string> Spellings { get; init; }

  public int ProductCount { get; init; }
  public bool HasRx { get; init; }
  public bool HasPrices { get; init; }
  public bool HasRxPrices { get; init; }
}

/// <summary>Groups labeler rows into labelers. Pure, so it needs no database.</summary>
public static partial class LabelerGroups
{
  private static readonly HashSet<string> CorporateWords =
  [
    "inc",
    "llc",
    "lp",
    "ltd",
    "limited",
    "corp",
    "corporation",
    "co",
    "company",
    "plc",
    "sa",
    "ag",
    "gmbh",
  ];

  [GeneratedRegex("['’`\u0092¿]")]
  private static partial Regex Apostrophes();

  [GeneratedRegex(@"[^\p{L}\p{N}]+")]
  private static partial Regex NonAlphanumeric();

  /// <summary>
  /// A labeler name in the form spellings are compared in: lower case, apostrophes (and the
  /// mis-encoded ones FDA's data has) deleted, other punctuation as spaces, and trailing
  /// corporate words dropped, never the first word. Mirrored by <c>normalizeLabeler</c> in the
  /// client's <c>library/labelers.ts</c>; change both.
  /// </summary>
  public static string Normalize(string name)
  {
    var spaced = NonAlphanumeric().Replace(Apostrophes().Replace(name.ToLowerInvariant(), ""), " ");
    var words = spaced.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
    while (words.Count > 1 && CorporateWords.Contains(words[^1]))
      words.RemoveAt(words.Count - 1);
    return string.Join(' ', words);
  }

  /// <summary>
  /// Joins rows whose names normalize alike or that share a labeler code, then makes one group
  /// of each, sorted by name.
  /// </summary>
  public static List<LabelerGroup> Group(IReadOnlyList<LabelerRow> rows)
  {
    var parent = Enumerable.Range(0, rows.Count).ToArray();
    int Find(int i)
    {
      while (parent[i] != i)
        i = parent[i] = parent[parent[i]];
      return i;
    }

    var normalized = rows.Select(row => Normalize(row.LabelerName)).ToArray();
    var firstByKey = new Dictionary<string, int>();
    for (var i = 0; i < rows.Count; i++)
    {
      // Prefixed so a name can't collide with a code. An empty name joins nothing by name.
      var keys = new List<string> { "code:" + rows[i].LabelerCode };
      if (normalized[i] != "")
        keys.Add("name:" + normalized[i]);
      foreach (var key in keys)
      {
        if (firstByKey.TryGetValue(key, out var first))
          parent[Find(i)] = Find(first);
        else
          firstByKey[key] = i;
      }
    }

    return Enumerable
      .Range(0, rows.Count)
      .GroupBy(Find)
      .Select(members =>
      {
        var groupRows = members.Select(i => rows[i]).ToList();
        var name = groupRows
          .GroupBy(row => row.LabelerName)
          .OrderByDescending(spelling => spelling.Sum(row => row.ProductCount))
          .ThenBy(spelling => spelling.Key, StringComparer.Ordinal)
          .First()
          .Key;
        var nameNormalized = Normalize(name);
        return new LabelerGroup
        {
          Name = name,
          Codes = groupRows
            .Select(row => row.LabelerCode)
            .Distinct()
            .Order(StringComparer.Ordinal)
            .ToList(),
          Spellings = members
            .Where(i => normalized[i] != "" && normalized[i] != nameNormalized)
            .GroupBy(i => normalized[i])
            .Select(spelling =>
              spelling
                .GroupBy(i => rows[i].LabelerName)
                .OrderByDescending(original => original.Sum(i => rows[i].ProductCount))
                .ThenBy(original => original.Key, StringComparer.Ordinal)
                .First()
                .Key
            )
            .Order(StringComparer.Ordinal)
            .ToList(),
          ProductCount = groupRows.Sum(row => row.ProductCount),
          HasRx = groupRows.Any(row => row.HasRx),
          HasPrices = groupRows.Any(row => row.HasPrices),
          HasRxPrices = groupRows.Any(row => row.HasRxPrices),
        };
      })
      .OrderBy(group => group.Name, StringComparer.OrdinalIgnoreCase)
      .ToList();
  }
}
