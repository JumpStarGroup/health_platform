#!/bin/bash
# Playwright E2E Test Runner
# Usage: ./run-tests.sh [options]
# Options:
#   --headed      Show browser UI during tests
#   --debug       Run in debug mode with Playwright Inspector
#   --ui          Open Playwright UI Mode (interactive)
#   --report      Open HTML report after tests

case "$1" in
  --headed)
    HEADLESS=false SLOW_MO=100 npx playwright test
    ;;
  --debug)
    npx playwright test --debug
    ;;
  --ui)
    npx playwright test --ui
    ;;
  --report)
    npx playwright show-report
    ;;
  *)
    echo "Running E2E tests in headless mode..."
    npx playwright test
    ;;
esac
