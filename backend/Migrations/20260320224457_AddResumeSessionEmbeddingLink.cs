using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OperationNexus.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResumeSessionEmbeddingLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ResumeEmbeddingId",
                table: "ResumeSessions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResumeSessions_ResumeEmbeddingId",
                table: "ResumeSessions",
                column: "ResumeEmbeddingId");

            migrationBuilder.AddForeignKey(
                name: "FK_ResumeSessions_ResumeEmbeddings_ResumeEmbeddingId",
                table: "ResumeSessions",
                column: "ResumeEmbeddingId",
                principalTable: "ResumeEmbeddings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ResumeSessions_ResumeEmbeddings_ResumeEmbeddingId",
                table: "ResumeSessions");

            migrationBuilder.DropIndex(
                name: "IX_ResumeSessions_ResumeEmbeddingId",
                table: "ResumeSessions");

            migrationBuilder.DropColumn(
                name: "ResumeEmbeddingId",
                table: "ResumeSessions");
        }
    }
}
