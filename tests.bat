:: tests.bat

@echo off
title Lanzador-Tests

echo ===================================================
echo SARA: Tests
echo ===================================================

:: Mapa del proyecto

echo [i] Generando mapa del proyecto...
powershell -NoProfile -Command "Get-ChildItem -Recurse | Where-Object { $_.FullName -notmatch 'node_modules|\.git|__pycache__|\.pytest_cache|venv|\.vscode' } | Sort-Object FullName | ForEach-Object { $relativePath = $_.FullName.Replace((Get-Location).Path, '').TrimStart('\\'); if ($relativePath) { $elements = $relativePath.Split('\\'); $indent = '  ' * ($elements.Count - 1); $indent + '|-- ' + $_.Name } }" > xtructure.txt

:: -----------------------------------------

:: Limpieza de servidores y puertos anteriores
taskkill /FI "WINDOWTITLE eq SARA-*" /T /F >nul 2>&1

:: 
echo Iniciando pytest (FastAPI)...
start "SARA-Tests-Brain" cmd /k "title SARA-Tests-Brain && cd brain && pytest tests/ -v"

echo Iniciando node:test (Node.js)...
start "SARA-Tests-Gateway" cmd /k "title SARA-Tests-Gateway && npm run test"

echo.
echo Suites de pruebas lanzadas en ventanas separadas.
echo.
