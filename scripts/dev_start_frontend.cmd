@echo off
setlocal

REM Terminal 2: frontend only
pushd "%~dp0\..\frontend"

call npm install
call start-dev.bat

popd
endlocal
