using DrugPricing.Models;
using DrugPricing.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrugPricing.Data.Configurations;

public class NadacPriceConfiguration : IEntityTypeConfiguration<NadacPrice>
{
  public void Configure(EntityTypeBuilder<NadacPrice> e)
  {
    e.Property(p => p.Ndc).HasMaxLength(11);

    e.Property(p => p.NadacPerUnit).HasPrecision(19, 4);

    e.Property(p => p.CorrespondingGenericNadacPerUnit).HasPrecision(19, 4);

    e.Property(p => p.PricingUnit).HasConversion<string>().HasMaxLength(2);

    e.Property(p => p.ClassificationForRateSetting)
      .HasConversion(
        v => v.ToString().Replace("_", "-"),
        v => Enum.Parse<NadacClassification>(v.Replace("-", "_"))
      )
      .HasMaxLength(6);

    e.Property(p => p.CreatedAt).HasDefaultValueSql("now()");

    e.Property(p => p.NdcDescriptionLower)
      .HasComputedColumnSql("LOWER(\"NdcDescription\")", stored: true);

    e.HasIndex(p => p.NdcDescriptionLower).HasMethod("gist").HasOperators("gist_trgm_ops");

    e.HasIndex(p => p.AsOfDate);

    e.HasIndex(p => p.Ndc);

    e.HasIndex(p => new
      {
        p.Ndc,
        p.EffectiveDate,
        p.AsOfDate,
      })
      .IsUnique();
  }
}
