using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OperationNexus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResumeSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResumeSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    SourceType = table.Column<string>(type: "text", nullable: false),
                    CandidateUpstreamId = table.Column<int>(type: "integer", nullable: true),
                    EmployeeUpstreamId = table.Column<int>(type: "integer", nullable: true),
                    CurrentStepKey = table.Column<string>(type: "text", nullable: false),
                    CompletedStepsJson = table.Column<string>(type: "text", nullable: true),
                    StepperContextJson = table.Column<string>(type: "text", nullable: true),
                    ResumeContentJson = table.Column<string>(type: "text", nullable: true),
                    OriginalResumeText = table.Column<string>(type: "text", nullable: true),
                    OriginalFileName = table.Column<string>(type: "text", nullable: true),
                    OriginalFileType = table.Column<string>(type: "text", nullable: true),
                    ProcessingMode = table.Column<string>(type: "text", nullable: false),
                    RefinementMode = table.Column<string>(type: "text", nullable: true),
                    UploadStatus = table.Column<string>(type: "text", nullable: false),
                    VectorizationStatus = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResumeSessions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResumeSessions_CreatedAt",
                table: "ResumeSessions",
                column: "CreatedAt",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_ResumeSessions_CandidateUpstreamId",
                table: "ResumeSessions",
                column: "CandidateUpstreamId");

            migrationBuilder.CreateIndex(
                name: "IX_ResumeSessions_EmployeeUpstreamId",
                table: "ResumeSessions",
                column: "EmployeeUpstreamId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResumeSessions");
        }
    }
}
