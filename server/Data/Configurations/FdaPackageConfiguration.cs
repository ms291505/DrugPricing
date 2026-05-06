using DrugPricing.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrugPricing.Data.Configurations;

public class FdaPackageConfiguration : IEntityTypeConfiguration<FdaPackage>
{
  public void Configure(EntityTypeBuilder<FdaPackage> e)
  {
    e.Property(p => p.CreatedAt).HasDefaultValueSql("now()");

    e.HasIndex(p => p.NdcPackageCode).IsUnique();

    e.HasIndex(p => p.ProductId);

    e.HasIndex(e => e.NdcPackageCodeStripped);
  }
}
