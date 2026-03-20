using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OperationNexus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTransformSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TransformSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    ContextType = table.Column<string>(type: "text", nullable: false),
                    ContextId = table.Column<int>(type: "integer", nullable: true),
                    ContextName = table.Column<string>(type: "text", nullable: false),
                    ProcessingMode = table.Column<string>(type: "text", nullable: false),
                    RefinementMode = table.Column<string>(type: "text", nullable: false),
                    JobDescription = table.Column<string>(type: "text", nullable: true),
                    JobDescriptionSource = table.Column<string>(type: "text", nullable: true),
                    SelectedPositionId = table.Column<string>(type: "text", nullable: true),
                    ResumeContentJson = table.Column<string>(type: "text", nullable: true),
                    WizardStateJson = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransformSessions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TransformSessions_ContextType_ContextId",
                table: "TransformSessions",
                columns: new[] { "ContextType", "ContextId" });

            migrationBuilder.CreateIndex(
                name: "IX_TransformSessions_CreatedAt",
                table: "TransformSessions",
                column: "CreatedAt",
                descending: new[] { true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TransformSessions");
        }
    }
}
