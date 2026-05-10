using DrugPricing.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrugPricing.Data.Configurations;

public class DrugPackageConfiguration : IEntityTypeConfiguration<DrugPackage>
{
  public void Configure(EntityTypeBuilder<DrugPackage> e)
  {
    e.Property(p => p.Ndc).HasMaxLength(11);

    e.Property(p => p.CreatedAt).HasDefaultValueSql("now()");

    e.Property(p => p.NdcDescriptionLower)
      .HasComputedColumnSql("LOWER(\"NdcDescription\")", stored: true);

    e.HasIndex(p => p.NdcDescriptionLower).HasMethod("GIN").HasOperators("gin_trgm_ops");

    e.HasIndex(p => p.Ndc).IsUnique();
  }
}
