using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace LifeTracker.Domain.Notes;

public static class SlugGenerator
{
    public static string Generate(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return "untitled";

        var normalizedString = text.Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder();

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                stringBuilder.Append(c);
            }
        }

        var cleanString = stringBuilder
            .ToString()
            .Normalize(NormalizationForm.FormC)
            .ToLowerInvariant();

        // Reemplazar cualquier caracter no [a-z0-9] por guión
        var replaced = Regex.Replace(cleanString, @"[^a-z0-9]+", "-");

        // Colapsar múltiples guiones consecutivos
        var collapsed = Regex.Replace(replaced, @"-+", "-");

        // Recortar guiones sobrantes en extremos
        var result = collapsed.Trim('-');

        return string.IsNullOrEmpty(result) ? "untitled" : result;
    }
}
