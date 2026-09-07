using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFileHashToHealthStudies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "file_hash",
                table: "health_studies",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_health_studies_user_hash",
                table: "health_studies",
                columns: new[] { "user_id", "file_hash" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_health_studies_user_hash",
                table: "health_studies");

            migrationBuilder.DropColumn(
                name: "file_hash",
                table: "health_studies");
        }
    }
}
