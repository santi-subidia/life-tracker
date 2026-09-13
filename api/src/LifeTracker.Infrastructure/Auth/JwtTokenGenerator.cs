using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using LifeTracker.Application.Common.Interfaces;

namespace LifeTracker.Infrastructure.Auth;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public const string DefaultSecretKey = "SomaLifeTrackerSecretKey2026SuperSecureTokenKey!#12345";
    public const string Issuer = "SomaApi";
    public const string Audience = "SomaClient";

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(Guid userId, string email, string? fullName, IEnumerable<string> roles)
    {
        var secret = _configuration["Jwt:SecretKey"]
                     ?? _configuration["Supabase:JwtSecret"]
                     ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
                     ?? Environment.GetEnvironmentVariable("SUPABASE_JWT_SECRET")
                     ?? DefaultSecretKey;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(ClaimTypes.Email, email),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Name, string.IsNullOrWhiteSpace(fullName) ? email : fullName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            Issuer = Issuer,
            Audience = Audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
