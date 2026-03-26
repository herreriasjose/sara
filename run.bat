:: run.bat

@echo off
:: 1. Protegemos esta ventana para que no se cierre a sí misma
title Lanzador-SARA

echo ===================================================
echo SARA: Arranque del Ecosistema
echo ===================================================

:: 2. Limpieza (Buscamos ventanas que empiecen por "SARA-")
echo [i] Liberando puertos y cerrando instancias previas...
taskkill /FI "WINDOWTITLE eq SARA-*" /T /F >nul 2>&1

:: 
echo Iniciando SARA Brain...
start "SARA-Brain" cmd /k "title SARA-Brain && cd brain && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Iniciando SARA Gateway...
start "SARA-Gateway" cmd /k "title SARA-Gateway && node --env-file=.env.dev src/server.js"

echo.
echo.
