namespace OperationNexus.Api.Models.Upstream;

public class PersonaNote
{
    public int PersonaNoteId { get; set; }
    public string NoteTypeName { get; set; } = string.Empty;
    public string NoteContent { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public string? Filename { get; set; }
}
