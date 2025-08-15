# Use the official .NET 8.0 SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app

# Copy solution file
COPY LogicLoom.sln ./

# Copy project files
COPY src/ ./src/

# Restore dependencies
RUN dotnet restore LogicLoom.sln

# Build and publish the API
RUN dotnet publish src/LogicLoom.Api -c Release -o out

# Use the official .NET 8.0 runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Copy the published app
COPY --from=build-env /app/out .

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose the port (Railway will set PORT at runtime)
EXPOSE 8080

# Start the application
ENTRYPOINT ["dotnet", "LogicLoom.Api.dll"]
