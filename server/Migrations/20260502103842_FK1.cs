using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class FK1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FdaPackages_FdaProducts_ProductId",
                table: "FdaPackages");

            migrationBuilder.DropForeignKey(
                name: "FK_NadacPrices_FdaPackages_Ndc",
                table: "NadacPrices");

            migrationBuilder.AlterColumn<string>(
                name: "Ndc",
                table: "NadacPrices",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(11)",
                oldMaxLength: 11);

            migrationBuilder.AlterColumn<string>(
                name: "ProductId",
                table: "FdaPackages",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddForeignKey(
                name: "FK_FdaPackages_FdaProducts_ProductId",
                table: "FdaPackages",
                column: "ProductId",
                principalTable: "FdaProducts",
                principalColumn: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_NadacPrices_FdaPackages_Ndc",
                table: "NadacPrices",
                column: "Ndc",
                principalTable: "FdaPackages",
                principalColumn: "NdcPackageCodeStripped");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FdaPackages_FdaProducts_ProductId",
                table: "FdaPackages");

            migrationBuilder.DropForeignKey(
                name: "FK_NadacPrices_FdaPackages_Ndc",
                table: "NadacPrices");

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

            migrationBuilder.AlterColumn<string>(
                name: "ProductId",
                table: "FdaPackages",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_FdaPackages_FdaProducts_ProductId",
                table: "FdaPackages",
                column: "ProductId",
                principalTable: "FdaProducts",
                principalColumn: "ProductId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_NadacPrices_FdaPackages_Ndc",
                table: "NadacPrices",
                column: "Ndc",
                principalTable: "FdaPackages",
                principalColumn: "NdcPackageCodeStripped",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
