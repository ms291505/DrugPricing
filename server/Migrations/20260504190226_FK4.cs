using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class FK4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NadacPrices_FdaPackages_Ndc",
                table: "NadacPrices");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_FdaPackages_NdcPackageCodeStripped",
                table: "FdaPackages");

            migrationBuilder.AlterColumn<string>(
                name: "Ndc",
                table: "NadacPrices",
                type: "character varying(11)",
                maxLength: 11,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(11)",
                oldMaxLength: 11,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Ndc",
                table: "NadacPrices",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(11)",
                oldMaxLength: 11);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_FdaPackages_NdcPackageCodeStripped",
                table: "FdaPackages",
                column: "NdcPackageCodeStripped");

            migrationBuilder.AddForeignKey(
                name: "FK_NadacPrices_FdaPackages_Ndc",
                table: "NadacPrices",
                column: "Ndc",
                principalTable: "FdaPackages",
                principalColumn: "NdcPackageCodeStripped");
        }
    }
}
