using LifeTracker.Domain.Notes;

namespace LifeTracker.Domain.Tests;

public class WikilinkParserTests
{
    private readonly WikilinkParser _parser = new();

    [Fact]
    public void ExtractLinks_SimpleWikilink_ShouldReturnTargetWithNullAlias()
    {
        // Arrange
        var content = "Esta es una nota sobre [[Clean Architecture]] para .NET.";

        // Act
        var links = _parser.ExtractLinks(content);

        // Assert
        Assert.Single(links);
        Assert.Equal("Clean Architecture", links[0].TargetTitle);
        Assert.Null(links[0].Alias);
    }

    [Fact]
    public void ExtractLinks_WithAlias_ShouldReturnTargetAndAlias()
    {
        // Arrange
        var content = "Consulta los principios de [[Clean Architecture|Arquitectura Limpia]].";

        // Act
        var links = _parser.ExtractLinks(content);

        // Assert
        Assert.Single(links);
        Assert.Equal("Clean Architecture", links[0].TargetTitle);
        Assert.Equal("Arquitectura Limpia", links[0].Alias);
    }

    [Fact]
    public void ExtractLinks_WithSpacesInsideBrackets_ShouldTrimCorrectly()
    {
        // Arrange
        var content = "Referencia: [[   Domain-Driven Design   |   DDD   ]].";

        // Act
        var links = _parser.ExtractLinks(content);

        // Assert
        Assert.Single(links);
        Assert.Equal("Domain-Driven Design", links[0].TargetTitle);
        Assert.Equal("DDD", links[0].Alias);
    }

    [Fact]
    public void ExtractLinks_InsideFencedCodeBlock_ShouldBeIgnored()
    {
        // Arrange
        var content = @"
# Documentación
Aquí hay un enlace válido: [[Nota Valida]].

```csharp
// Este enlace dentro de bloque cercado no debe extraerse:
var enlace = ""[[Nota En Codigo]]"";
```

~~~markdown
Y tampoco este: [[Nota En Tildes]]
~~~
";

        // Act
        var links = _parser.ExtractLinks(content);

        // Assert
        Assert.Single(links);
        Assert.Equal("Nota Valida", links[0].TargetTitle);
    }

    [Fact]
    public void ExtractLinks_InsideInlineCode_ShouldBeIgnored()
    {
        // Arrange
        var content = "Usa la sintaxis `[[Nota En Codigo Inline]]` para enlazar hacia [[Nota Real]].";

        // Act
        var links = _parser.ExtractLinks(content);

        // Assert
        Assert.Single(links);
        Assert.Equal("Nota Real", links[0].TargetTitle);
    }

    [Fact]
    public void ExtractLinks_EscapedBrackets_ShouldBeIgnored()
    {
        // Arrange
        var content = @"Este enlace está escapado: \[\[Nota Escapada\]\], pero este no: [[Nota Valida]].";

        // Act
        var links = _parser.ExtractLinks(content);

        // Assert
        Assert.Single(links);
        Assert.Equal("Nota Valida", links[0].TargetTitle);
    }

    [Fact]
    public void ExtractLinks_EmptyTarget_ShouldBeIgnored()
    {
        // Arrange
        var content = "Corchetes vacíos [[]] o con espacios [[   ]] o [[ | Alias ]] no deben generar links.";

        // Act
        var links = _parser.ExtractLinks(content);

        // Assert
        Assert.Empty(links);
    }

    [Fact]
    public void ExtractLinks_DuplicateTargets_ShouldPrioritizeAliasIfPresent()
    {
        // Arrange
        var content = "Primero cito a [[Domain Modeling]] y luego a [[Domain Modeling|Modelado]].";

        // Act
        var links = _parser.ExtractLinks(content);

        // Assert
        Assert.Single(links);
        Assert.Equal("Domain Modeling", links[0].TargetTitle);
        Assert.Equal("Modelado", links[0].Alias);
    }

    [Fact]
    public void ExtractTags_ValidTags_ShouldExtractAndDeduplicateInLowercase()
    {
        // Arrange
        var content = "Trabajando con #CSharp, #dotnet y de nuevo #csharp y #DOTNET.";

        // Act
        var tags = _parser.ExtractTags(content);

        // Assert
        Assert.Equal(2, tags.Count);
        Assert.Equal("csharp", tags[0]);
        Assert.Equal("dotnet", tags[1]);
    }

    [Fact]
    public void ExtractTags_MarkdownHeaders_ShouldBeIgnored()
    {
        // Arrange
        var content = @"
# Titulo Principal
## Subtitulo Nivel 2
### Tercer Nivel
Este es un párrafo con un tag real #productividad y otro #segundo-cerebro.
";

        // Act
        var tags = _parser.ExtractTags(content);

        // Assert
        Assert.Equal(2, tags.Count);
        Assert.Contains("productividad", tags);
        Assert.Contains("segundo-cerebro", tags);
    }

    [Fact]
    public void ExtractTags_UrlAnchorsAndCodeBlocks_ShouldBeIgnored()
    {
        // Arrange
        var content = @"
Visita https://ejemplo.com/#seccion-importante para ver detalles.
```python
# comentario en codigo
print('#en-codigo')
```
Tag en línea: `print('#inline')`
Tag escapado: \#escapado
Tag legítimo: #backend-dotnet.
";

        // Act
        var tags = _parser.ExtractTags(content);

        // Assert
        Assert.Single(tags);
        Assert.Equal("backend-dotnet", tags[0]);
    }

    [Theory]
    [InlineData("Programación Orientada a Objetos", "programacion-orientada-a-objetos")]
    [InlineData("¿Cómo funciona el cerebro?", "como-funciona-el-cerebro")]
    [InlineData("  Espacios   Múltiples y Símbolos @#$%  ", "espacios-multiples-y-simbolos")]
    [InlineData("Año 2026: Nuevas Metas!", "ano-2026-nuevas-metas")]
    [InlineData("", "untitled")]
    [InlineData("   ---   ", "untitled")]
    public void SlugGenerator_ShouldProduceNormalizedKebabCaseSlug(string input, string expected)
    {
        // Act
        var slug = SlugGenerator.Generate(input);

        // Assert
        Assert.Equal(expected, slug);
    }

    [Fact]
    public void Note_CreateStub_ShouldInitializeAsStubWithEmptyContent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var title = "Nota Fantasma";
        var slug = "nota-fantasma";

        // Act
        var stub = Note.CreateStub(userId, title, slug);

        // Assert
        Assert.True(stub.IsStub);
        Assert.False(stub.IsArchived);
        Assert.False(stub.Pinned);
        Assert.Equal(string.Empty, stub.Content);
        Assert.Empty(stub.Tags);
        Assert.Equal(title, stub.Title);
        Assert.Equal(slug, stub.Slug);
        Assert.Equal(userId, stub.UserId);
        Assert.NotEqual(Guid.Empty, stub.Id);
    }

    [Fact]
    public void Note_UpdateContent_ShouldMaterializeStubIntoRealNote()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var stub = Note.CreateStub(userId, "Arquitectura Hexagonal", "arquitectura-hexagonal");
        Assert.True(stub.IsStub);

        // Act
        stub.UpdateContent("Arquitectura Hexagonal", "arquitectura-hexagonal", "Contenido real de la nota...", ["patrones", "software"], true);

        // Assert
        Assert.False(stub.IsStub);
        Assert.Equal("Contenido real de la nota...", stub.Content);
        Assert.Equal(2, stub.Tags.Count);
        Assert.True(stub.Pinned);
    }
}
