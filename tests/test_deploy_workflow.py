from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_staging_workflow_has_safe_runtime_fallbacks():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy-staging.yml").read_text()

    assert 'export DATABASE_URL="sqlite:///instance/health_platform.db"' in workflow
    assert 'export BACKEND_REPLICAS=1' in workflow
    assert 'export JWT_SECRET="$(openssl rand -hex 32)"' in workflow


def test_ci_cd_workflows_enforce_trunk_release_flow():
    pr_validation = (REPO_ROOT / ".github" / "workflows" / "pr-validation.yml").read_text()
    staging = (REPO_ROOT / ".github" / "workflows" / "deploy-staging.yml").read_text()
    production = (REPO_ROOT / ".github" / "workflows" / "release-production.yml").read_text()

    assert "pull_request:\n    branches:\n      - main" in pr_validation
    assert "push:\n    branches:\n      - main" in staging
    assert "environment: staging" in staging
    assert "tags:\n      - 'v*.*.*'" in production
    assert "environment: production" in production
    assert "git merge-base --is-ancestor" in production


def test_staging_deploys_commit_immutable_image_tag():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy-staging.yml").read_text()

    assert "type=sha,prefix=sha-,format=long" in workflow
    assert "DEPLOY_IMAGE_TAG: ${{ github.event_name == 'workflow_dispatch'" in workflow
    assert "|| format('sha-{0}', github.sha) }}" in workflow


def test_deploy_identity_metadata_uses_environment_variables():
    for workflow_name in ("deploy-staging.yml", "release-production.yml"):
        workflow = (REPO_ROOT / ".github" / "workflows" / workflow_name).read_text()

        assert "GHCR_USERNAME: ${{ vars.GHCR_USERNAME }}" in workflow
        assert "uses: azure/k8s-set-context@v4" in workflow
        assert "kubeconfig-encoding: plaintext" in workflow
        assert "secrets.GHCR_USERNAME" not in workflow
        assert "secrets.KUBE_CONTEXT" not in workflow
        assert "vars.KUBE_CONTEXT" not in workflow
        assert "kubectl create namespace" not in workflow
        assert "github.repository_owner }}" not in workflow.split("GHCR_USERNAME:", 1)[1].splitlines()[0]


def test_k8s_template_uses_secret_for_backend_sensitive_values():
    template = (REPO_ROOT / "deploy" / "k8s-template.yaml").read_text()

    assert "kind: Secret" in template
    assert "name: backend-secrets" in template
    assert 'DATABASE_URL: "${DATABASE_URL}"' in template
    assert 'JWT_SECRET: "${JWT_SECRET}"' in template
    assert "secretKeyRef:" in template
    assert "configMapKeyRef:\n                  name: backend-config\n                  key: DATABASE_URL" not in template
    assert "configMapKeyRef:\n                  name: backend-config\n                  key: JWT_SECRET" not in template
