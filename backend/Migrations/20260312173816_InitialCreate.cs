using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Pgvector;

#nullable disable

namespace OperationNexus.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.CreateTable(
                name: "ResumeEmbeddings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceType = table.Column<string>(type: "text", nullable: false),
                    SourceId = table.Column<int>(type: "integer", nullable: false),
                    UpstreamId = table.Column<int>(type: "integer", nullable: false),
                    Embedding = table.Column<Vector>(type: "vector(1536)", nullable: false),
                    ResumeText = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsBench = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResumeEmbeddings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SyncedCandidates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UpstreamId = table.Column<int>(type: "integer", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Seniority = table.Column<string>(type: "text", nullable: true),
                    MainSkill = table.Column<string>(type: "text", nullable: true),
                    Country = table.Column<string>(type: "text", nullable: true),
                    CurrentSalary = table.Column<decimal>(type: "numeric", nullable: true),
                    SalaryCurrency = table.Column<string>(type: "text", nullable: true),
                    HasResume = table.Column<bool>(type: "boolean", nullable: false),
                    ResumeNoteId = table.Column<int>(type: "integer", nullable: true),
                    ResumeDateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResumeFilename = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    StatusReason = table.Column<string>(type: "text", nullable: true),
                    SyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncedCandidates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SyncedEmployees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UpstreamId = table.Column<int>(type: "integer", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Seniority = table.Column<string>(type: "text", nullable: false),
                    MainSkill = table.Column<string>(type: "text", nullable: false),
                    Country = table.Column<string>(type: "text", nullable: false),
                    GrossMonthlySalary = table.Column<decimal>(type: "numeric", nullable: true),
                    SalaryCurrency = table.Column<string>(type: "text", nullable: true),
                    LastAccount = table.Column<string>(type: "text", nullable: true),
                    LastAccountStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Rate = table.Column<decimal>(type: "numeric", nullable: true),
                    HasResume = table.Column<bool>(type: "boolean", nullable: false),
                    ResumeNoteId = table.Column<int>(type: "integer", nullable: true),
                    ResumeDateCreated = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResumeFilename = table.Column<string>(type: "text", nullable: true),
                    IsBench = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    StatusReason = table.Column<string>(type: "text", nullable: true),
                    SyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncedEmployees", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResumeEmbeddings_SourceType_SourceId",
                table: "ResumeEmbeddings",
                columns: new[] { "SourceType", "SourceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SyncedCandidates_UpstreamId",
                table: "SyncedCandidates",
                column: "UpstreamId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SyncedEmployees_UpstreamId",
                table: "SyncedEmployees",
                column: "UpstreamId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResumeEmbeddings");

            migrationBuilder.DropTable(
                name: "SyncedCandidates");

            migrationBuilder.DropTable(
                name: "SyncedEmployees");
        }
    }
}
