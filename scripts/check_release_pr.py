#!/usr/bin/env python3
"""Validate release/hotfix PRs before merge to main.

This script is intended to run in CI on pull requests targeting main
from release/* or hotfix/* branches.
"""

import os
import re
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
BASE_REF = os.getenv("BASE_REF", "origin/main")
HEAD_REF = os.getenv("HEAD_REF", "HEAD")


def run_git(*args: str) -> str:
    cmd = ["git", "-C", str(REPO_ROOT), *args]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "git command failed")
    return result.stdout.strip()


def get_branch_name() -> str:
    # In GitHub Actions pull_request runs, checkout is detached and
    # `git rev-parse --abbrev-ref HEAD` typically returns "HEAD".
    for key in ("GITHUB_HEAD_REF", "GITHUB_REF_NAME"):
        value = os.getenv(key)
        if value:
            return value

    try:
        name = run_git("rev-parse", "--abbrev-ref", HEAD_REF)
        return "" if name == "HEAD" else name
    except Exception:
        return ""

def get_changed_files() -> list[str]:
    try:
        output = run_git("diff", "--name-only", f"{BASE_REF}...{HEAD_REF}")
    except Exception:
        # Fallback for local runs without a remote base ref
        output = run_git("diff", "--name-only", "--diff-filter=AM", "HEAD~1", "HEAD")
    return [line.strip() for line in output.splitlines() if line.strip()]


def main() -> int:
    branch_name = get_branch_name()
    if not branch_name.startswith(("release/", "hotfix/")):
        print("Skipping release validation because current branch is not a release/hotfix branch.")
        return 0

    version = branch_name.split("/", 1)[1]
    expected_tag = f"v{version}"
    expected_release_note = f"docs/releases/RELEASE_NOTES_{expected_tag}.md"

    changed_files = get_changed_files()
    print("Branch:", branch_name)
    print("Expected version:", version)
    print("Expected tag:", expected_tag)
    print("Expected release note:", expected_release_note)
    print("Changed files:")
    for path in changed_files:
        print("  -", path)

    errors = []

    if "VERSION" not in changed_files:
        errors.append("Missing VERSION update in this release/hotfix PR.")

    if "CHANGELOG.md" not in changed_files:
        errors.append("Missing CHANGELOG.md update in this release/hotfix PR.")

    if expected_release_note not in changed_files:
        errors.append(f"Missing release notes file: {expected_release_note}")

    version_file = REPO_ROOT / "VERSION"
    if not version_file.exists():
        errors.append("VERSION file does not exist.")
    else:
        current_version = version_file.read_text(encoding="utf-8").strip()
        if current_version != version:
            errors.append(f"VERSION content ({current_version}) does not match branch version ({version}).")

    changelog_file = REPO_ROOT / "CHANGELOG.md"
    if not changelog_file.exists():
        errors.append("CHANGELOG.md does not exist.")
    elif f"## [{version}]" not in changelog_file.read_text(encoding="utf-8"):
        errors.append(f"CHANGELOG.md does not contain an entry for version {version}.")

    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        errors.append("Release branch name must use semantic version format MAJOR.MINOR.PATCH.")

    release_note_file = REPO_ROOT / expected_release_note
    if release_note_file.exists():
        rel_text = release_note_file.read_text(encoding="utf-8")
        if f"# Release Notes - {expected_tag}" not in rel_text:
            errors.append("Release notes header does not match the expected tag name.")
    else:
        errors.append("Release notes file does not exist on disk.")

    if errors:
        print("\nRelease PR validation failed:")
        for item in errors:
            print("  -", item)
        return 1

    print("\nRelease PR validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
