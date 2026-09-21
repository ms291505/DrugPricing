using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class FdaProductNdcKeyAndDelistedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The FDA tables hold duplicate ProductNdc values from the old ProductId-keyed
            // upsert, so they must be cleared before ProductNdc can carry a unique index.
            // Both tables are fully rebuilt by the next ETL run.
            migrationBuilder.Sql(@"DELETE FROM ""FdaPackages""; DELETE FROM ""FdaProducts"";");

            migrationBuilder.DropForeignKey(
                name: "FK_FdaPackages_FdaProducts_ProductId",
                table: "FdaPackages");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_FdaProducts_ProductId",
                table: "FdaProducts");

            migrationBuilder.DropIndex(
                name: "IX_FdaProducts_ProductId",
                table: "FdaProducts");

            migrationBuilder.DropIndex(
                name: "IX_FdaPackages_ProductId",
                table: "FdaPackages");

            migrationBuilder.AddColumn<DateTime>(
                name: "DelistedAt",
                table: "FdaProducts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProductNdc",
                table: "FdaPackages",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "ProductId",
                table: "FdaPackages",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DelistedAt",
                table: "FdaPackages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_FdaProducts_ProductNdc",
                table: "FdaProducts",
                column: "ProductNdc");

            migrationBuilder.CreateIndex(
                name: "IX_FdaProducts_ProductId",
                table: "FdaProducts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_FdaProducts_ProductNdc",
                table: "FdaProducts",
                column: "ProductNdc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FdaPackages_ProductNdc",
                table: "FdaPackages",
                column: "ProductNdc");

            migrationBuilder.AddForeignKey(
                name: "FK_FdaPackages_FdaProducts_ProductNdc",
                table: "FdaPackages",
                column: "ProductNdc",
                principalTable: "FdaProducts",
                principalColumn: "ProductNdc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FdaPackages_FdaProducts_ProductNdc",
                table: "FdaPackages");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_FdaProducts_ProductNdc",
                table: "FdaProducts");

            migrationBuilder.DropIndex(
                name: "IX_FdaProducts_ProductId",
                table: "FdaProducts");

            migrationBuilder.DropIndex(
                name: "IX_FdaProducts_ProductNdc",
                table: "FdaProducts");

            migrationBuilder.DropIndex(
                name: "IX_FdaPackages_ProductNdc",
                table: "FdaPackages");

            migrationBuilder.DropColumn(
                name: "DelistedAt",
                table: "FdaProducts");

            migrationBuilder.DropColumn(
                name: "DelistedAt",
                table: "FdaPackages");

            migrationBuilder.AlterColumn<string>(
                name: "ProductNdc",
                table: "FdaPackages",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProductId",
                table: "FdaPackages",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_FdaProducts_ProductId",
                table: "FdaProducts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_FdaProducts_ProductId",
                table: "FdaProducts",
                column: "ProductId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FdaPackages_ProductId",
                table: "FdaPackages",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_FdaPackages_FdaProducts_ProductId",
                table: "FdaPackages",
                column: "ProductId",
                principalTable: "FdaProducts",
                principalColumn: "ProductId");
        }
    }
}
