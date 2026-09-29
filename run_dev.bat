@echo off
title Baghewala Heavy-Oil Digital Twin
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_dev.ps1"
if %errorlevel% neq 0 pause
