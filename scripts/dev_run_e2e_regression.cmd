@echo off
setlocal

REM Terminal 3: operational terminal for tests/scripts only
pushd "%~dp0\..\tests\e2e"
echo Operational Terminal Ready,will do e2e regression tests here.

call npx playwright install --with-deps
call npx playwright test tests/regression-user-journey-cn.spec.js --headed --reporter=html,list

popd
endlocal
