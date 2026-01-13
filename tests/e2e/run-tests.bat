@echo off
REM Playwright E2E Test Runner
REM Usage: run-tests.bat [options]
REM Options:
REM   --headed      Show browser UI during tests
REM   --debug       Run in debug mode with Playwright Inspector
REM   --ui          Open Playwright UI Mode (interactive)
REM   --report      Open HTML report after tests

setlocal

if "%1"=="--headed" (
    set HEADLESS=false
    set SLOW_MO=100
    npx playwright test
) else if "%1"=="--debug" (
    npx playwright test --debug
) else if "%1"=="--ui" (
    npx playwright test --ui
) else if "%1"=="--report" (
    npx playwright show-report
) else (
    echo Running E2E tests in headless mode...
    npx playwright test
)

endlocal
