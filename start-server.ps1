# PowerShell Runner para o Servidor Node.js
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe) {
    Write-Error "Node.js não encontrado no PATH. Instale o Node.js v18+ a partir de https://nodejs.org/"
    exit 1
}

Write-Host "Iniciando servidor Node.js em http://localhost:8000..." -ForegroundColor Cyan
Write-Host "Conectando ao MongoDB Atlas (familytree)..." -ForegroundColor Green
Start-Process "http://localhost:8000/"
node server.js
