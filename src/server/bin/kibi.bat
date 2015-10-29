@echo off

SETLOCAL

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe
set SERVER=%DIR%\src\bin\kibi.js
set NODE_ENV="production"
set CONFIG_PATH=%DIR%\config\kibi.yml
set ROOT_DIR=%DIR%\

TITLE Kibi Server @@version


set JAVA_POST_INSTALL=%DIR%\src\node_modules\jdbc\node_modules\java\postInstall.js
"%NODE%" "%JAVA_POST_INSTALL%"

REM add shipped node to the path as sync_request in fallback mode requires installed node
set PATH=%PATH%;%DIR%\node

"%NODE%" "%SERVER%" %*

:finally

ENDLOCAL


