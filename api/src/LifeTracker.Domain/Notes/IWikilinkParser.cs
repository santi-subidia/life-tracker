namespace LifeTracker.Domain.Notes;

public record WikilinkMatch(string TargetTitle, string? Alias);

public interface IWikilinkParser
{
    IReadOnlyList<WikilinkMatch> ExtractLinks(string markdownContent);
    IReadOnlyList<string> ExtractTags(string markdownContent);
}
