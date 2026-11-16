# PowerShell Runner para o Servidor PHP
$phpExe = (Get-Command php -ErrorAction SilentlyContinue).Source
if (-not $phpExe) {
    $wingetPhp = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe"
    if (Test-Path $wingetPhp) {
        $phpExe = $wingetPhp
    }
}

if (-not $phpExe) {
    Write-Error "PHP 8.3 não encontrado. Instale via 'winget install PHP.PHP.8.3'."
    exit 1
}

Write-Host "Iniciando servidor PHP em http://localhost:8000..." -ForegroundColor Cyan
Write-Host "Conectando ao MongoDB Atlas (familytree)..." -ForegroundColor Green
Start-Process "http://localhost:8000/"
& $phpExe -S localhost:8000
