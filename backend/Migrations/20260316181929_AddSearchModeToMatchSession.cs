using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OperationNexus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSearchModeToMatchSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SearchMode",
                table: "MatchSessions",
                type: "text",
                nullable: false,
                defaultValue: "opus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SearchMode",
                table: "MatchSessions");
        }
    }
}
