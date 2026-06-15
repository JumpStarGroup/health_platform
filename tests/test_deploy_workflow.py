from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_staging_workflow_has_safe_runtime_fallbacks():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy-staging.yml").read_text()

    assert 'export DATABASE_URL="sqlite:///instance/health_platform.db"' in workflow
    assert 'export BACKEND_REPLICAS=1' in workflow
    assert 'export JWT_SECRET="$(openssl rand -hex 32)"' in workflow


def test_k8s_template_uses_secret_for_backend_sensitive_values():
    template = (REPO_ROOT / "deploy" / "k8s-template.yaml").read_text()

    assert "kind: Secret" in template
    assert "name: backend-secrets" in template
    assert 'DATABASE_URL: "${DATABASE_URL}"' in template
    assert 'JWT_SECRET: "${JWT_SECRET}"' in template
    assert "secretKeyRef:" in template
    assert "configMapKeyRef:\n                  name: backend-config\n                  key: DATABASE_URL" not in template
    assert "configMapKeyRef:\n                  name: backend-config\n                  key: JWT_SECRET" not in template
