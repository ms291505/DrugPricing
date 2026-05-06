using DrugPricing.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrugPricing.Data.Configurations;

public class NadacImportConfiguration : IEntityTypeConfiguration<NadacImport>
{
  public void Configure(EntityTypeBuilder<NadacImport> e)
  {
    e.Property(p => p.CreatedAt).HasDefaultValueSql("now()");
  }
}
