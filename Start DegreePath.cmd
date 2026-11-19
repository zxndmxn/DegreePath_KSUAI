@echo off
title DegreePath
cd /d "%~dp0"
where node >nul 2>nul || (echo DegreePath needs Node.js 22 or newer: https://nodejs.org & pause & exit /b 1)
node scripts\start.mjs
if errorlevel 1 pause
