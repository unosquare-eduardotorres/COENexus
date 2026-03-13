using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OperationNexus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPipelineStatusAndFailed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "SyncedAt",
                table: "SyncedEmployees",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ResumeDateCreated",
                table: "SyncedEmployees",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastAccountStartDate",
                table: "SyncedEmployees",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Failed",
                table: "SyncedEmployees",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "SyncedAt",
                table: "SyncedCandidates",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ResumeDateCreated",
                table: "SyncedCandidates",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Failed",
                table: "SyncedCandidates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "ResumeEmbeddings",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ResumeEmbeddings",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.Sql(@"ALTER TABLE ""ResumeEmbeddings"" ALTER COLUMN ""Embedding"" DROP NOT NULL;");

            migrationBuilder.Sql(@"UPDATE ""SyncedEmployees"" SET ""Status"" = 'synced' WHERE ""Status"" IN ('updated', 'unchanged');");
            migrationBuilder.Sql(@"UPDATE ""SyncedCandidates"" SET ""Status"" = 'synced' WHERE ""Status"" IN ('updated', 'unchanged');");
            migrationBuilder.Sql(@"UPDATE ""SyncedEmployees"" e SET ""Status"" = 'vectorized' FROM ""ResumeEmbeddings"" re WHERE re.""SourceType"" = 'employees' AND re.""SourceId"" = e.""Id"" AND re.""Embedding"" IS NOT NULL;");
            migrationBuilder.Sql(@"UPDATE ""SyncedCandidates"" c SET ""Status"" = 'vectorized' FROM ""ResumeEmbeddings"" re WHERE re.""SourceType"" = 'candidates' AND re.""SourceId"" = c.""Id"" AND re.""Embedding"" IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Failed",
                table: "SyncedEmployees");

            migrationBuilder.DropColumn(
                name: "Failed",
                table: "SyncedCandidates");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SyncedAt",
                table: "SyncedEmployees",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ResumeDateCreated",
                table: "SyncedEmployees",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastAccountStartDate",
                table: "SyncedEmployees",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "SyncedAt",
                table: "SyncedCandidates",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ResumeDateCreated",
                table: "SyncedCandidates",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "ResumeEmbeddings",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ResumeEmbeddings",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");
        }
    }
}
