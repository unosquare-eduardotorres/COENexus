using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OperationNexus.Api.Migrations
{
    public partial class AddJobTitle : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "JobTitle",
                table: "SyncedEmployees",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JobTitle",
                table: "SyncedEmployees");
        }
    }
}
