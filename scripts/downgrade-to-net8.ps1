# Script to downgrade all projects from .NET 9.0 to .NET 8.0

$projects = @(
    "src\LogicLoom.Client\LogicLoom.Client.csproj",
    "src\LogicLoom.DocumentProcessor\LogicLoom.DocumentProcessor.csproj", 
    "src\LogicLoom.Identity\LogicLoom.Identity.csproj",
    "src\LogicLoom.Shared\LogicLoom.Shared.csproj",
    "src\LogicLoom.Shared.Models\LogicLoom.Shared.Models.csproj",
    "src\LogicLoom.Storage\LogicLoom.Storage.csproj"
)

foreach ($project in $projects) {
    Write-Host "Updating $project to .NET 8.0..."
    $content = Get-Content $project -Raw
    $content = $content -replace "net9\.0", "net8.0"
    $content = $content -replace "9\.0\.\d+", "8.0.8"
    Set-Content $project $content -NoNewline
    Write-Host "✅ Updated $project"
}

Write-Host ""
Write-Host "All projects updated to .NET 8.0!" -ForegroundColor Green
