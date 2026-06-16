# Design: Immutable Images for CI/CD

## 1. Overview
- Goal: ensure all CI builds produce immutable image identifiers (digest / sha256) and all deploy workflows consume those exact identifiers when rendering Kubernetes manifests. This prevents "image tag drift" and guarantees reproducible deploys.
- Scope: GitHub Actions workflows, Docker build/push steps, deploy workflows (.github/workflows/deploy-staging.yml and .github/workflows/release-production.yml), and `deploy/k8s-template.yaml` manifest templates.

Reference: requirements to produce image@sha256 in manifests and guarantee existence before kubectl apply.

## 2. Architecture & Data Flow (build -> metadata -> deploy)

- Build job (GitHub Actions) performs:
  - Login to registry
  - Compute tags (branch/ref) via `docker/metadata-action`
  - Build & push via `docker/build-push-action` (push: true)
  - Read the pushed image digest from `steps.build.outputs.digest`
  - Emit a job output `image` equal to `registry/name@sha256:<digest>`

- Deploy job (needs: build) consumes `needs.build.outputs.image` and:
  - Verifies image manifest exists in registry (HTTP HEAD to manifest URL) with short retries
  - Renders k8s template (replace placeholder with exact image@sha256)
  - `kubectl apply` the rendered manifest
  - Waits for rollout and runs health/smoke checks; rollback on failure

Data flow diagram (linear):

Build -> docker/metadata-action -> docker/build-push-action -> job output `image` -> Deploy job consumes `image` -> verify image exists -> render manifest -> kubectl apply -> rollout + health checks -> success/rollback

## 3. Exact workflow changes

High-level changes for both workflows (`deploy-staging.yml`, `release-production.yml`):

- Add a `build` job that:
  - Runs on pushes (staging) or release (production)
  - Uses `docker/metadata-action` to compute tags
  - Uses `docker/build-push-action` to build and push
  - Sets a job-level output `image` with the value `registry/name@${{ steps.build.outputs.digest }}`

- Modify the `deploy` job to:
  - Add `needs: build`
  - Read `image: ${{ needs.build.outputs.image }}`
  - Verify the image exists in registry (with retries)
  - Render `deploy/k8s-template.yaml` by substituting `IMAGE_PLACEHOLDER` -> `needs.build.outputs.image`
  - Apply manifests and perform rollout checks and smoke tests

Example `deploy-staging.yml` fragments (key parts only):

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.set-image.outputs.image }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Get metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/myapp
          tags: |
            type=ref,event=branch

      - name: Build and push
        id: build
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}

      - name: Set job image output
        id: set-image
        run: |
          DIGEST=${{ steps.build.outputs.digest }}
          IMAGE="${{ env.REGISTRY }}/myapp@${DIGEST}"
          echo "image=${IMAGE}" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Verify image exists
        id: verify
        env:
          IMAGE: ${{ needs.build.outputs.image }}
          REGISTRY_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
        run: |
          ./scripts/verify-image-exists.sh "$IMAGE" "$REGISTRY_TOKEN"

      - name: Render k8s manifests
        run: |
          IMAGE="${{ needs.build.outputs.image }}"
          sed 's|IMAGE_PLACEHOLDER|'"$IMAGE"'|g' deploy/k8s-template.yaml > /tmp/rendered.yaml

      - name: kubectl apply
        run: |
          kubectl apply -f /tmp/rendered.yaml

      - name: Wait for rollout and run smoke tests
        run: |
          ./scripts/verify-rollout-and-smoke.sh myapp

Notes: add similar patterns to `release-production.yml`, but scope triggers to tags/releases and add approvals as required.

## 4. Changes to `deploy/k8s-template.yaml`

- Principle: keep a single manifest template with a single, easy-to-replace placeholder token.

Recommendation: use `IMAGE_PLACEHOLDER` as token.

Example snippet (Deployment):

apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: IMAGE_PLACEHOLDER
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5

Usage: scripts or GH Actions step must replace `IMAGE_PLACEHOLDER` with the exact `registry/name@sha256:...` string provided by the build job output.

Alternative: use Helm values file with `image: repository:tag` and set `--set image.repository=... --set image.tag=@sha256` but simple sed replacement is lowest-friction.

## 5. How to extract digest and set as job outputs

Use `docker/build-push-action` with `push: true`. The action emits `digest` output under `steps.<id>.outputs.digest` (commit to pinned action major). Then set a step output and expose as job output.

Example steps:

- name: Build and push
  id: build
  uses: docker/build-push-action@v4
  with:
    context: .
    push: true
    tags: ${{ steps.meta.outputs.tags }}

- name: Set job image output
  id: set-image
  run: |
    DIGEST=${{ steps.build.outputs.digest }}
    IMAGE="${{ env.REGISTRY }}/myapp@${DIGEST}"
    echo "image=${IMAGE}" >> $GITHUB_OUTPUT

Then expose as a job output:

jobs:
  build:
    outputs:
      image: ${{ steps.set-image.outputs.image }}

Consume in later job via `needs.build.outputs.image`.

Notes: if `steps.build.outputs.digest` is empty (older action versions), use `docker/metadata-action` to compute labels and tags; alternatively inspect the registry after push to fetch the digest via `skopeo` or registry HTTP API.

## 6. Fallbacks, retries, and verification steps

Verify the image exists before applying manifests to avoid deploying non-existent images.

Suggested verification script (scripts/verify-image-exists.sh):

#!/usr/bin/env bash
set -euo pipefail
IMAGE="$1"
TOKEN="$2"

# parse registry/name@sha256:sha
REGISTRY=$(echo "$IMAGE" | awk -F/ '{print $1}')
NAME_AND_DIGEST=$(echo "$IMAGE" | cut -d/ -f2-)
NAME=$(echo "$NAME_AND_DIGEST" | cut -d@ -f1)
DIGEST=$(echo "$NAME_AND_DIGEST" | cut -d@ -f2)

MANIFEST_URL="https://${REGISTRY}/v2/${NAME}/manifests/${DIGEST}"

for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
    -H "Authorization: Bearer ${TOKEN}" "${MANIFEST_URL}") || STATUS=0
  if [ "$STATUS" = "200" ]; then
    echo "Image manifest found"
    exit 0
  fi
  echo "Image manifest not found (status=$STATUS). Retrying... ($i)"
  sleep $((i * 5))
done

echo "Image manifest not found after retries" >&2
exit 2

Action step should pass `${{ secrets.REGISTRY_TOKEN }}` to this script. For private registries, construct or reuse existing login token.

Also add `kubectl apply --dry-run=server -f /tmp/rendered.yaml` as an additional safety gate.

## 7. Plan for staged rollout (staging -> canary -> prod) and automated rollback on health check failure

Staged rollout strategy:

- Staging: deploy to `staging` namespace using the new image digest and run full smoke suite.
- Canary (optional): deploy a canary deployment (or use progressive delivery/controller like Flagger) where you update `deployment-canary` with 5% traffic (scale to 1 replica) while primary remains at stable image. Run acceptance tests against canary.
- Production: after canary success, promote image to production by updating `image` in production manifest to the same digest and apply.

Automation & rollback:

- After `kubectl apply`, run `kubectl rollout status deployment/myapp --timeout=3m`.
- Run smoke tests (API endpoints, DB connectivity, key business flows). Provide a Go/Node/Python script `scripts/verify-rollout-and-smoke.sh` that:
  - Waits for pods ready
  - Queries health endpoints
  - Runs smoke test commands
  - Returns non-zero on failure
- On failure, run `kubectl rollout undo deployment/myapp` and mark the GitHub Action step as failed. Optionally create a GitHub Issue or post to slack.

If using advanced delivery tools (Flux/Argo/Flagger/Helmfile), use their canary/promotion APIs and feed them the immutable image string.

## 8. Testing strategy and smoke tests to validate deploy correctness

Layered tests:

- Unit: ensure scripts that render manifests and parse digests have unit tests.
- Integration (CI): run workflows in a disposable environment using a test registry (e.g., GitHub Container Registry or Quay staging repo) and a kind/k3s cluster in CI to exercise full build->deploy flow.
- Staging smoke tests (post-deploy):
  - `GET /health/ready` returns 200
  - Basic API flow (auth, create, read) runs end-to-end
  - DB connectivity checks
  - Metric emission (optional)

Smoke test snippet (curl-based):

curl --fail --retry 5 --retry-delay 2 "https://staging.example.com/health/ready"

Validation checks:

- Validate the rendered manifest contains the digest string: `grep -q "@sha256:" /tmp/rendered.yaml`
- After apply, confirm `kubectl get deployment myapp -o=jsonpath='{.spec.template.spec.containers[0].image}'` equals desired digest.

## 9. Implementation checklist and estimated effort

- 1. Create `scripts/verify-image-exists.sh` and `scripts/verify-rollout-and-smoke.sh` (1-2 days)
- 2. Update `.github/workflows/deploy-staging.yml` with `build` job outputs and deploy consumption (0.5-1 day)
- 3. Update `.github/workflows/release-production.yml` similarly, add approvals (0.5-1 day)
- 4. Update `deploy/k8s-template.yaml` to use `IMAGE_PLACEHOLDER` and add readiness/liveness probes (0.25 day)
- 5. Add CI integration tests using a test registry and kind (1-2 days)
- 6. Add canary promotion automation or integrate with Flagger (2-4 days, optional)
- 7. Run end-to-end validation and adjust secrets/permissions (0.5-1 day)

Total estimated effort: 3–9 working days depending on whether you integrate advanced progressive delivery tooling.

## 10. Example scripts and useful commands

Verify manifest exists (example curl usage inside GH Action):

curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" -H "Authorization: Bearer $TOKEN" \
  -o /dev/null -w "%{http_code}" "https://$REGISTRY/v2/$NAME/manifests/$DIGEST"

Check deployed image equals digest:

kubectl get deployment myapp -n production -o=jsonpath='{.spec.template.spec.containers[0].image}'

Dry-run apply before real apply:

kubectl apply --dry-run=server -f /tmp/rendered.yaml

Roll back on failure:

kubectl rollout undo deployment/myapp -n production

## 11. Next steps / Offer

- I can open a PR that adds the two small scripts and updates the two workflows with the snippets above.
- I can also post a concise comment with this design to a GitHub Issue if you provide `owner`, `repo` and `issue_number`.

---

Design created by System Architect agent.
