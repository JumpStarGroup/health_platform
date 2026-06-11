@echo off
setlocal

REM Terminal 1: backend only
pushd "%~dp0\.."

if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
    call ".venv\Scripts\activate.bat"
    python -m pip install --upgrade pip
    if exist "requirements.txt" (
        pip install -r requirements.txt
    )
) else (
    call ".venv\Scripts\activate.bat"
)

set PYTHONPATH=.
python -m flask --app src.app run --host=0.0.0.0 --port=5000

popd
endlocal
