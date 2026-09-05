# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy project files and restore dependencies
COPY LifeTracker.slnx .
COPY src/LifeTracker.Domain/LifeTracker.Domain.csproj src/LifeTracker.Domain/
COPY src/LifeTracker.Application/LifeTracker.Application.csproj src/LifeTracker.Application/
COPY src/LifeTracker.Infrastructure/LifeTracker.Infrastructure.csproj src/LifeTracker.Infrastructure/
COPY src/LifeTracker.Api/LifeTracker.Api.csproj src/LifeTracker.Api/
COPY tests/LifeTracker.Domain.Tests/LifeTracker.Domain.Tests.csproj tests/LifeTracker.Domain.Tests/

RUN dotnet restore LifeTracker.slnx

# Copy source code and build
COPY . .
RUN dotnet publish src/LifeTracker.Api/LifeTracker.Api.csproj -c Release -o /out --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .

EXPOSE 5000
ENTRYPOINT ["dotnet", "LifeTracker.Api.dll"]
