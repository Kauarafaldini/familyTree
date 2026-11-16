@echo off
title Servidor FamilyTree - PHP & MongoDB
echo ========================================================
echo  Iniciando Servidor Local - FamilyTree
echo  Banco de Dados: MongoDB Atlas (familytree)
echo  Backend: PHP 8.3
echo ========================================================
echo.

:: Localiza o executável do PHP
set "PHP_CMD=php"
where php >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe" (
        set "PHP_CMD=%LOCALAPPDATA%\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe"
    ) else (
        echo [ERRO] PHP nao encontrado no PATH ou no diretorio padrao do WinGet.
        echo Certifique-se de que o PHP 8.3 esta instalado.
        pause
        exit /b 1
    )
)

echo Usando: %PHP_CMD%
echo.
echo Abrindo o navegador em http://localhost:8000 ...
start http://localhost:8000/

echo.
echo ========================================================
echo Servidor rodando em: http://localhost:8000
echo Pressione Ctrl+C para encerrar o servidor.
echo ========================================================
echo.

"%PHP_CMD%" -S localhost:8000
