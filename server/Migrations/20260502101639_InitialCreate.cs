using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DrugPackages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NdcDescription = table.Column<string>(type: "text", nullable: false),
                    NdcDescriptionLower = table.Column<string>(type: "text", nullable: false, computedColumnSql: "LOWER(\"NdcDescription\")", stored: true),
                    Ndc = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false),
                    LoadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DrugPackages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FdaProducts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<string>(type: "text", nullable: false),
                    ProductNdc = table.Column<string>(type: "text", nullable: false),
                    ProductTypeName = table.Column<string>(type: "text", nullable: false),
                    ProprietaryName = table.Column<string>(type: "text", nullable: false),
                    ProprietaryNameSuffix = table.Column<string>(type: "text", nullable: true),
                    NonProprietaryName = table.Column<string[]>(type: "text[]", nullable: false),
                    DosageFormName = table.Column<string>(type: "text", nullable: false),
                    RouteName = table.Column<string[]>(type: "text[]", nullable: false),
                    StartMarketingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndMarketingDate = table.Column<DateOnly>(type: "date", nullable: true),
                    MarketingCategoryName = table.Column<string>(type: "text", nullable: false),
                    ApplicationNumber = table.Column<string>(type: "text", nullable: true),
                    LabelerName = table.Column<string>(type: "text", nullable: false),
                    SubstanceName = table.Column<string[]>(type: "text[]", nullable: false),
                    StrengthNumber = table.Column<string[]>(type: "text[]", nullable: false),
                    StrengthUnit = table.Column<string[]>(type: "text[]", nullable: false),
                    PharmClasses = table.Column<string[]>(type: "text[]", nullable: false),
                    DeaSchedule = table.Column<string>(type: "text", nullable: true),
                    NdcExcludeFlag = table.Column<string>(type: "text", nullable: true),
                    ListingRecordCertifiedThrough = table.Column<DateOnly>(type: "date", nullable: true),
                    LoadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FdaProducts", x => x.Id);
                    table.UniqueConstraint("AK_FdaProducts_ProductId", x => x.ProductId);
                });

            migrationBuilder.CreateTable(
                name: "NadacImports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AsOfDate = table.Column<DateOnly>(type: "date", nullable: false),
                    SourceUrl = table.Column<string>(type: "text", nullable: false),
                    RecordCount = table.Column<int>(type: "integer", nullable: false),
                    LoadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NadacImports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FdaPackages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<string>(type: "text", nullable: false),
                    ProductNdc = table.Column<string>(type: "text", nullable: false),
                    NdcPackageCode = table.Column<string>(type: "text", nullable: false),
                    PackageDescription = table.Column<string>(type: "text", nullable: false),
                    StartMarketingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndMarketingDate = table.Column<DateOnly>(type: "date", nullable: true),
                    NdcExcludeFlag = table.Column<string>(type: "text", nullable: true),
                    SamplePackage = table.Column<bool>(type: "boolean", nullable: false),
                    NdcPackageCodeStripped = table.Column<string>(type: "text", nullable: false),
                    LoadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FdaPackages", x => x.Id);
                    table.UniqueConstraint("AK_FdaPackages_NdcPackageCodeStripped", x => x.NdcPackageCodeStripped);
                    table.ForeignKey(
                        name: "FK_FdaPackages_FdaProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "FdaProducts",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NadacPrices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NdcDescription = table.Column<string>(type: "text", nullable: false),
                    Ndc = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false),
                    NadacPerUnit = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    EffectiveDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PricingUnit = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    PharmacyTypeIndicator = table.Column<string>(type: "text", nullable: true),
                    IsOtc = table.Column<bool>(type: "boolean", nullable: false),
                    ExplanationCode = table.Column<int[]>(type: "integer[]", nullable: false),
                    ClassificationForRateSetting = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    CorrespondingGenericNadacPerUnit = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: true),
                    CorrespondingGenericEffectiveDate = table.Column<DateOnly>(type: "date", nullable: true),
                    AsOfDate = table.Column<DateOnly>(type: "date", nullable: false),
                    NdcDescriptionLower = table.Column<string>(type: "text", nullable: false, computedColumnSql: "LOWER(\"NdcDescription\")", stored: true),
                    LoadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NadacPrices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NadacPrices_FdaPackages_Ndc",
                        column: x => x.Ndc,
                        principalTable: "FdaPackages",
                        principalColumn: "NdcPackageCodeStripped",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DrugPackages_Ndc",
                table: "DrugPackages",
                column: "Ndc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DrugPackages_NdcDescriptionLower",
                table: "DrugPackages",
                column: "NdcDescriptionLower")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_FdaPackages_NdcPackageCode",
                table: "FdaPackages",
                column: "NdcPackageCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FdaPackages_NdcPackageCodeStripped",
                table: "FdaPackages",
                column: "NdcPackageCodeStripped");

            migrationBuilder.CreateIndex(
                name: "IX_FdaPackages_ProductId",
                table: "FdaPackages",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_FdaProducts_ProductId",
                table: "FdaProducts",
                column: "ProductId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NadacPrices_AsOfDate",
                table: "NadacPrices",
                column: "AsOfDate");

            migrationBuilder.CreateIndex(
                name: "IX_NadacPrices_Ndc",
                table: "NadacPrices",
                column: "Ndc");

            migrationBuilder.CreateIndex(
                name: "IX_NadacPrices_Ndc_EffectiveDate_AsOfDate",
                table: "NadacPrices",
                columns: new[] { "Ndc", "EffectiveDate", "AsOfDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NadacPrices_NdcDescriptionLower",
                table: "NadacPrices",
                column: "NdcDescriptionLower")
                .Annotation("Npgsql:IndexMethod", "gist")
                .Annotation("Npgsql:IndexOperators", new[] { "gist_trgm_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DrugPackages");

            migrationBuilder.DropTable(
                name: "NadacImports");

            migrationBuilder.DropTable(
                name: "NadacPrices");

            migrationBuilder.DropTable(
                name: "FdaPackages");

            migrationBuilder.DropTable(
                name: "FdaProducts");
        }
    }
}
