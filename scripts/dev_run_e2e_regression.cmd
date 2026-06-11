@echo off
setlocal

REM Terminal 3: operational terminal for tests/scripts only
pushd "%~dp0\..\tests\e2e"
echo Operational Terminal Ready,will do e2e regression tests here.

REM Usage: dev_run_e2e_regression.cmd [E2E_BASE_URL] [disable-webserver]
REM Examples:
REM   dev_run_e2e_regression.cmd https://test-env.example.com
REM   dev_run_e2e_regression.cmd https://test-env.example.com disable

REM Quick mode: pass the literal "testenv" to auto-set example test env values
REM   scripts\dev_run_e2e_regression.cmd testenv
REM This will set E2E_BASE_URL=https://test-env.example.com and disable webServer auto-start
REM (useful for CI or demo environments). You can edit the URL below if you want a different default.
if /I "%~1"=="testenv" (
	set E2E_BASE_URL=https://test-env.example.com
	set E2E_DISABLE_WEBSERVER=1
	echo Quick testenv mode: E2E_BASE_URL=%E2E_BASE_URL% E2E_DISABLE_WEBSERVER=%E2E_DISABLE_WEBSERVER%
	shift
)

if not "%~1"=="" (
	set E2E_BASE_URL=%~1
	echo Using E2E_BASE_URL=%E2E_BASE_URL%
)

if /I "%~2"=="disable" (
	set E2E_DISABLE_WEBSERVER=1
	echo WebServer auto-start disabled (E2E_DISABLE_WEBSERVER=1)
)

call npx playwright install --with-deps
call npx playwright test tests/regression-user-journey-cn.spec.js --headed --reporter=html,list

popd
endlocal
