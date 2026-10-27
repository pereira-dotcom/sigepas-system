@echo off
cd /d "%~dp0"
rem --- Copia de respaldos a la nube (Google Drive para escritorio) ---
rem Quite "rem" de la linea siguiente y ajuste la ruta a su carpeta de Drive:
rem set CLOUD_DIR=C:\Users\USUARIO\Google Drive\SIGEPAS
node server.js
pause
