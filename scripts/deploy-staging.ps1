$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting PrintGo Staging Deployment..." -ForegroundColor Cyan

Write-Host "📦 Tearing down old staging containers (if any)..."
docker-compose -f ../docker-compose.staging.yml down -v

Write-Host "🏗️ Building new staging containers..."
docker-compose -f ../docker-compose.staging.yml build

Write-Host "🚀 Starting staging environment..."
docker-compose -f ../docker-compose.staging.yml up -d

Write-Host "⏳ Waiting for Postgres to be ready..."
Start-Sleep -Seconds 10

Write-Host "🗄️ Running database migrations in staging backend container..."
docker-compose -f ../docker-compose.staging.yml exec backend npx prisma migrate deploy

Write-Host "✅ Staging environment deployed successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5174"
Write-Host "Backend: http://localhost:5001"
