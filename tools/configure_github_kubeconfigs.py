#!/usr/bin/env python3
"""Configure namespace-scoped Kubernetes credentials in GitHub Environments."""

import argparse
import base64
import json
import os
import subprocess
import tempfile


ENVIRONMENTS = {
    "development": "health-platform-dev",
    "staging": "health-platform-staging",
    "production": "health-platform-prod",
}


def run(
    *args: str,
    input_text: str | None = None,
    allowed_returncodes: tuple[int, ...] = (0,),
) -> str:
    result = subprocess.run(
        args,
        input=input_text,
        capture_output=True,
        check=False,
        text=True,
    )
    if result.returncode not in allowed_returncodes:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout


def build_kubeconfig(namespace: str) -> str:
    source = json.loads(
        run("kubectl", "config", "view", "--minify", "--raw", "--flatten", "-o", "json")
    )
    cluster_name = source["contexts"][0]["context"]["cluster"]
    cluster = next(item["cluster"] for item in source["clusters"] if item["name"] == cluster_name)
    secret = json.loads(
        run("kubectl", "-n", namespace, "get", "secret", "github-deployer-token", "-o", "json")
    )
    token = base64.b64decode(secret["data"]["token"]).decode("utf-8")
    identity = f"github-deployer@{namespace}"
    kubeconfig = {
        "apiVersion": "v1",
        "kind": "Config",
        "clusters": [{"name": cluster_name, "cluster": cluster}],
        "contexts": [
            {
                "name": identity,
                "context": {
                    "cluster": cluster_name,
                    "namespace": namespace,
                    "user": identity,
                },
            }
        ],
        "current-context": identity,
        "users": [{"name": identity, "user": {"token": token}}],
    }
    return json.dumps(kubeconfig, separators=(",", ":"))


def validate_kubeconfig(kubeconfig: str, namespace: str) -> None:
    path = ""
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
            handle.write(kubeconfig)
            path = handle.name

        required_checks = (
            ("get", "deployments.apps"),
            ("create", "secrets"),
            ("get", "pods"),
            ("get", "pods/log"),
        )
        for verb, resource in required_checks:
            allowed = run(
                "kubectl",
                "--kubeconfig",
                path,
                "auth",
                "can-i",
                verb,
                resource,
                "-n",
                namespace,
            ).strip()
            if allowed != "yes":
                raise RuntimeError(f"Missing permission: {verb} {resource} in {namespace}")

        cluster_scope = run(
            "kubectl",
            "--kubeconfig",
            path,
            "auth",
            "can-i",
            "create",
            "namespaces",
            allowed_returncodes=(0, 1),
        ).strip()
        if cluster_scope != "no":
            raise RuntimeError(f"Credential for {namespace} unexpectedly has cluster-scoped access")
    finally:
        if path and os.path.exists(path):
            os.remove(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default="JumpStarGroup/health_platform")
    args = parser.parse_args()

    for environment, namespace in ENVIRONMENTS.items():
        kubeconfig = build_kubeconfig(namespace)
        validate_kubeconfig(kubeconfig, namespace)
        run(
            "gh",
            "secret",
            "set",
            "KUBE_CONFIG",
            "--repo",
            args.repo,
            "--env",
            environment,
            input_text=kubeconfig,
        )
        print(f"Configured KUBE_CONFIG for {environment} ({namespace})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())