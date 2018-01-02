@echo off

SETLOCAL EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
for %%I in ("%SCRIPT_DIR%..") do set DIR=%%~dpfI

set NODE=%DIR%\node\node.exe

WHERE /Q node
IF %ERRORLEVEL% EQU 0 (
  for /f "delims=" %%i in ('WHERE node') do set SYS_NODE=%%i
)

If Not Exist "%NODE%" (
  IF Exist "%SYS_NODE%" (
    set "NODE=%SYS_NODE%"
  ) else (
    Echo unable to find usable node.js executable.
    Exit /B 1
  )
)

TITLE Kibi Server


REM kibi: we need conditionally run script to set the correct java home

set CONFIG_PATH=%DIR%\config\investigate.yml
echo Checking jdbc_enabled flag in %CONFIG_PATH%

for /f "tokens=2 delims=:" %%i in ('findstr /r /c:"load_jdbc:[ ]*" "%CONFIG_PATH%"') do set JDBC_ENABLED=%%i
rem trim the variable
for /f "tokens=* delims= " %%a in ("%JDBC_ENABLED%") do set JDBC_ENABLED=%%a
for /l %%a in (1,1,100) do if "!JDBC_ENABLED:~-1!"==" " set JDBC_ENABLED=!JDBC_ENABLED:~0,-1!

echo Detected jdbc_enabled: [%JDBC_ENABLED%]
set JAVA_POST_INSTALL=%DIR%\node_modules\jdbc\node_modules\java\postInstall.js

IF "%JDBC_ENABLED%" == "true" (
"%NODE%" "%JAVA_POST_INSTALL%"
)

REM add shipped node to the path as sync_request in fallback mode requires installed node
set PATH=%PATH%;%DIR%\node

REM kibi: end

cd %DIR%

REM do NOT add a space before && !!!
set ROOT_DIR=%DIR%&& "%NODE%" %NODE_OPTIONS% --no-warnings "%DIR%\src\cli" %*

:finally

ENDLOCAL
