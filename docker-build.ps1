#!/usr/bin/env pwsh
# Build and optionally push Docker image for CompoundInterest

param(
    [string]$Tag = "latest",
    [string]$ImageName = "compound-interest",
    [switch]$Push,
    [string]$Registry = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🐳 Building Docker image..." -ForegroundColor Cyan

# Build the image
$fullImageName = if ($Registry) { "$Registry/$ImageName`:$Tag" } else { "$ImageName`:$Tag" }

Write-Host "Building: $fullImageName" -ForegroundColor Green
docker build -t $fullImageName .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""
Write-Host "Image: $fullImageName" -ForegroundColor Cyan
Write-Host "Size: " -NoNewline

# Show image size
docker images $fullImageName --format "{{.Size}}"

Write-Host ""
Write-Host "📦 To test locally run:" -ForegroundColor Yellow
Write-Host "  docker run -p 8080:80 $fullImageName" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Then open: http://localhost:8080" -ForegroundColor Yellow

if ($Push) {
    Write-Host ""
    Write-Host "🚀 Pushing to registry..." -ForegroundColor Cyan
    docker push $fullImageName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Push failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Push successful!" -ForegroundColor Green
}

Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
