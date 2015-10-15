@echo off

SETLOCAL

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe
set SERVER=%DIR%\src\bin\replace_encryption_key.js
set NODE_ENV="production"
set CONFIG_PATH=%DIR%\config\kibi.yml
set ROOT_DIR=%DIR%\

TITLE "Kibi Replace Encryption Key"

"%NODE%" "%SERVER%" %*

:finally

ENDLOCAL


