# Use the official .NET 8 runtime as the base image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

# Use the .NET 8 SDK for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["src/LogicLoom.AiNews.Api/LogicLoom.AiNews.Api.csproj", "LogicLoom.AiNews.Api/"]
COPY ["src/LogicLoom.AiNews.Core/LogicLoom.AiNews.Core.csproj", "LogicLoom.AiNews.Core/"]

# Restore dependencies
RUN dotnet restore "LogicLoom.AiNews.Api/LogicLoom.AiNews.Api.csproj"

# Copy source code
COPY src/ .

# Build the application
RUN dotnet build "LogicLoom.AiNews.Api/LogicLoom.AiNews.Api.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "LogicLoom.AiNews.Api/LogicLoom.AiNews.Api.csproj" -c Release -o /app/publish

# Final stage
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "LogicLoom.AiNews.Api.dll"]
