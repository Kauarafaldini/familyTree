@echo off
title Servidor FamilyTree - Node.js & MongoDB Atlas
echo ========================================================
echo  Iniciando Servidor Local - FamilyTree
echo  Banco de Dados: MongoDB Atlas (familytree)
echo  Backend: Node.js / Express
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado no PATH.
    echo Instale o Node.js v18+ a partir de https://nodejs.org/
    pause
    exit /b 1
)

echo Abrindo o navegador em http://localhost:8000 ...
start http://localhost:8000/

echo.
echo ========================================================
echo Servidor rodando em: http://localhost:8000
echo Pressione Ctrl+C para encerrar o servidor.
echo ========================================================
echo.

node server.js
