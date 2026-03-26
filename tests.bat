:: tests.bat

@echo off
title Lanzador-Tests

echo ===================================================
echo SARA: Suite de Tests
echo ===================================================

echo [i] Liberando puertos y cerrando instancias previas...
taskkill /FI "WINDOWTITLE eq SARA-*" /T /F >nul 2>&1

:: 
echo Iniciando validacion del Motor Bayesiano (FastAPI)...
start "SARA-Tests-Brain" cmd /k "title SARA-Tests-Brain && cd brain && pytest tests/ -v"

echo Iniciando validacion de Infraestructura (Node.js)...
start "SARA-Tests-Gateway" cmd /k "title SARA-Tests-Gateway && npm run test"

echo.
echo Suites de pruebas lanzadas en ventanas separadas.
echo.
