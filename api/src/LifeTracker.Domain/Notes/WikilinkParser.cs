using System.Text.RegularExpressions;

namespace LifeTracker.Domain.Notes;

public class WikilinkParser : IWikilinkParser
{
    // Regex para enmascarar bloques de código delimitados (fenced code blocks ``` y ~~~)
    private static readonly Regex FencedCodeRegex = new(
        @"(?s)(```|~~~).*?(?:\1|$)",
        RegexOptions.Compiled);

    // Regex para enmascarar código en línea (`...`)
    private static readonly Regex InlineCodeRegex = new(
        @"`[^`\r\n]*`",
        RegexOptions.Compiled);

    // Regex para ignorar wikilinks escapados con barra invertida (\[\[...\]\] o \[\[)
    private static readonly Regex EscapedWikilinkRegex = new(
        @"\\\[\\\[.*?\\\]\\\]|\\\[\\\[",
        RegexOptions.Compiled);

    // Regex para ignorar tags escapados (\#)
    private static readonly Regex EscapedHashRegex = new(
        @"\\#",
        RegexOptions.Compiled);

    // Regex para wikilinks: [[Target]] o [[Target|Alias]]
    private static readonly Regex WikilinkRegex = new(
        @"\[\[\s*([^\[\]\|\r\n]+?)\s*(?:\|\s*([^\[\]\r\n]*?)\s*)?\]\]",
        RegexOptions.Compiled);

    // Regex para tags: #tag alfanuméricos ignorando encabezados markdown y anchors de URLs
    private static readonly Regex TagRegex = new(
        @"(?<=^|[\s\(\[\{])#([a-zA-Z0-9_\-]+)(?=$|[\s\)\]\}\.,;!?])",
        RegexOptions.Compiled);

    public IReadOnlyList<WikilinkMatch> ExtractLinks(string markdownContent)
    {
        if (string.IsNullOrWhiteSpace(markdownContent))
            return [];

        var sanitized = SanitizeForLinks(markdownContent);
        var matches = WikilinkRegex.Matches(sanitized);

        var linksMap = new Dictionary<string, WikilinkMatch>(StringComparer.OrdinalIgnoreCase);

        foreach (Match match in matches)
        {
            var target = match.Groups[1].Value.Trim();
            if (string.IsNullOrWhiteSpace(target))
                continue;

            string? alias = null;
            if (match.Groups[2].Success)
            {
                var aliasVal = match.Groups[2].Value.Trim();
                if (!string.IsNullOrWhiteSpace(aliasVal))
                {
                    alias = aliasVal;
                }
            }

            if (linksMap.TryGetValue(target, out var existing))
            {
                // Si la existente no tenía alias y esta nueva sí, priorizamos la que tiene alias
                if (existing.Alias == null && alias != null)
                {
                    linksMap[target] = new WikilinkMatch(target, alias);
                }
            }
            else
            {
                linksMap[target] = new WikilinkMatch(target, alias);
            }
        }

        return linksMap.Values.ToList().AsReadOnly();
    }

    public IReadOnlyList<string> ExtractTags(string markdownContent)
    {
        if (string.IsNullOrWhiteSpace(markdownContent))
            return [];

        var sanitized = SanitizeForTags(markdownContent);
        var matches = TagRegex.Matches(sanitized);

        var tagsSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match match in matches)
        {
            var tag = match.Groups[1].Value.Trim();
            if (!string.IsNullOrWhiteSpace(tag))
            {
                tagsSet.Add(tag.ToLowerInvariant());
            }
        }

        return tagsSet.OrderBy(t => t, StringComparer.Ordinal).ToList().AsReadOnly();
    }

    private static string SanitizeForLinks(string content)
    {
        var text = FencedCodeRegex.Replace(content, " ");
        text = InlineCodeRegex.Replace(text, " ");
        text = EscapedWikilinkRegex.Replace(text, " ");
        return text;
    }

    private static string SanitizeForTags(string content)
    {
        var text = FencedCodeRegex.Replace(content, " ");
        text = InlineCodeRegex.Replace(text, " ");
        text = EscapedHashRegex.Replace(text, " ");
        return text;
    }
}
