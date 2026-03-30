@echo off
title Lanzador-servidores

echo ===================================================
echo SARA: servidores
echo ===================================================

:: Mapa del proyecto

echo [i] Generando mapa del proyecto...
powershell -NoProfile -Command "Get-ChildItem -Recurse | Where-Object { $_.FullName -notmatch 'node_modules|\.git|__pycache__|\.pytest_cache|venv|\.vscode' } | Sort-Object FullName | ForEach-Object { $relativePath = $_.FullName.Replace((Get-Location).Path, '').TrimStart('\\'); if ($relativePath) { $elements = $relativePath.Split('\\'); $indent = '  ' * ($elements.Count - 1); $indent + '|-- ' + $_.Name } }" > xtructure.txt

:: -----------------------------------------

:: Limpieza de servidores y puertos anteriores
echo [i] Liberando puertos y cerrando instancias previas...
taskkill /FI "WINDOWTITLE eq SARA-*" /T /F >nul 2>&1

:: 
echo Iniciando SARA Brain...
start "SARA-Brain" cmd /k "title SARA-Brain && cd brain && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Iniciando SARA Gateway...
start "SARA-Gateway" cmd /k "title SARA-Gateway && node --env-file=.env.dev src/server.js"

echo.