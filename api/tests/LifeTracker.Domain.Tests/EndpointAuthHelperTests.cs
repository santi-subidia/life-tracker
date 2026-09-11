using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using LifeTracker.Api.Endpoints;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class EndpointAuthHelperTests
{
    [Fact]
    public void GetUserId_WithValidNameIdentifierClaim_ReturnsUserId()
    {
        // Arrange
        var expectedId = Guid.NewGuid();
        var context = new DefaultHttpContext();
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, expectedId.ToString())
        }, "TestAuth");
        context.User = new ClaimsPrincipal(identity);

        // Act
        var result = EndpointAuthHelper.GetUserId(context);

        // Assert
        Assert.Equal(expectedId, result);
    }

    [Fact]
    public void GetUserId_WithValidSubClaim_ReturnsUserId()
    {
        // Arrange
        var expectedId = Guid.NewGuid();
        var context = new DefaultHttpContext();
        var identity = new ClaimsIdentity(new[]
        {
            new Claim("sub", expectedId.ToString())
        }, "TestAuth");
        context.User = new ClaimsPrincipal(identity);

        // Act
        var result = EndpointAuthHelper.GetUserId(context);

        // Assert
        Assert.Equal(expectedId, result);
    }

    [Fact]
    public void GetUserId_WithoutJwtClaim_WithValidXUserIdHeader_ReturnsHeaderUserId()
    {
        // Arrange
        var expectedId = Guid.NewGuid();
        var context = new DefaultHttpContext();
        context.Request.Headers["X-User-Id"] = expectedId.ToString();

        // Act
        var result = EndpointAuthHelper.GetUserId(context);

        // Assert
        Assert.Equal(expectedId, result);
    }

    [Fact]
    public void GetUserId_WithoutClaimsOrHeaders_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var context = new DefaultHttpContext();

        // Act & Assert
        var ex = Assert.Throws<UnauthorizedAccessException>(() => EndpointAuthHelper.GetUserId(context));
        Assert.Contains("Usuario no autenticado", ex.Message);
    }

    [Fact]
    public void GetUserId_WithInvalidGuidInHeader_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Headers["X-User-Id"] = "invalid-guid-string";

        // Act & Assert
        Assert.Throws<UnauthorizedAccessException>(() => EndpointAuthHelper.GetUserId(context));
    }
}
