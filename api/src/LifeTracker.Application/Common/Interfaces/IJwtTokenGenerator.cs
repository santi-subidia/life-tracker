using System.Collections.Generic;

namespace LifeTracker.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(Guid userId, string email, string? fullName, IEnumerable<string> roles);
}
