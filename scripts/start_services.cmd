@echo off
setlocal

REM Wrapper script: reuse existing start scripts
pushd "%~dp0\.."

start "HealthPlatform Backend" cmd /k "call scripts\dev_start_backend.cmd"
echo Started backend in new window.

echo Waiting 6 seconds before starting frontend...
timeout /t 6 /nobreak >nul

start "HealthPlatform Frontend" cmd /k "call scripts\dev_start_frontend.cmd"
echo Started frontend in new window.

popd
echo All start commands issued.
endlocal
exit /b 0
