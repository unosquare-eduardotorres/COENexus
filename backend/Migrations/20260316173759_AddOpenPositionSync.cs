using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OperationNexus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOpenPositionSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OpenPositionCandidates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OpenPositionId = table.Column<int>(type: "integer", nullable: false),
                    CandidateRequisitionId = table.Column<int>(type: "integer", nullable: false),
                    CandidateId = table.Column<int>(type: "integer", nullable: false),
                    CandidateName = table.Column<string>(type: "text", nullable: false),
                    MainSkill = table.Column<string>(type: "text", nullable: false),
                    IsEmployee = table.Column<bool>(type: "boolean", nullable: false),
                    CandidateStatus = table.Column<string>(type: "text", nullable: false),
                    Rate = table.Column<decimal>(type: "numeric", nullable: false),
                    StartDate = table.Column<string>(type: "text", nullable: true),
                    SyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OpenPositionCandidates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SyncedOpenPositions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UpstreamId = table.Column<int>(type: "integer", nullable: false),
                    Account = table.Column<string>(type: "text", nullable: false),
                    Coe = table.Column<string>(type: "text", nullable: false),
                    Practice = table.Column<string>(type: "text", nullable: false),
                    Stakeholder = table.Column<string>(type: "text", nullable: false),
                    MainSkill = table.Column<string>(type: "text", nullable: false),
                    Countries = table.Column<string>(type: "text", nullable: false),
                    Seniorities = table.Column<string>(type: "text", nullable: false),
                    AvailableRange = table.Column<string>(type: "text", nullable: false),
                    AccountOverview = table.Column<string>(type: "text", nullable: false),
                    JobDescription = table.Column<string>(type: "text", nullable: false),
                    JobTitle = table.Column<string>(type: "text", nullable: false),
                    PositionStatus = table.Column<string>(type: "text", nullable: false),
                    Aging = table.Column<int>(type: "integer", nullable: false),
                    Created = table.Column<string>(type: "text", nullable: true),
                    ReadyDate = table.Column<string>(type: "text", nullable: true),
                    LastModification = table.Column<string>(type: "text", nullable: true),
                    Sourcing = table.Column<string>(type: "text", nullable: false),
                    Replacement = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    StatusReason = table.Column<string>(type: "text", nullable: true),
                    Failed = table.Column<bool>(type: "boolean", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncedOpenPositions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OpenPositionCandidates_OpenPositionId_CandidateRequisitionId",
                table: "OpenPositionCandidates",
                columns: new[] { "OpenPositionId", "CandidateRequisitionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SyncedOpenPositions_UpstreamId",
                table: "SyncedOpenPositions",
                column: "UpstreamId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OpenPositionCandidates");

            migrationBuilder.DropTable(
                name: "SyncedOpenPositions");
        }
    }
}
