@echo off
setlocal

REM Wrapper script: reuse existing regression script
pushd "%~dp0\.."

call scripts\dev_run_e2e_regression.cmd %*
set "EXIT_CODE=%ERRORLEVEL%"

popd
endlocal & exit /b %EXIT_CODE%
