# Requirement: Immutable Images for CI/CD

## 1. Background & Value
- **User Story**: As a developer or release owner, I want CI/CD deployments to use immutable image digests, so that every deployment is reproducible and does not drift from the artifact that was actually built.
- **Business Value**: This removes image tag drift, improves traceability between source code and deployed workloads, reduces deployment risk, and makes rollback and auditability more reliable.

## 2. Scope & Boundaries
- **In-Scope**:
  - GitHub Actions workflows for staging and production deployments.
  - Build jobs that publish Docker images and expose the final immutable reference as `image@sha256:...`.
  - Deploy jobs that consume the immutable image reference from the build job output.
  - Verification that the image manifest exists in the registry before `kubectl apply` runs.
  - Rendering Kubernetes manifests from a single placeholder token such as `IMAGE_PLACEHOLDER`.
  - Rollout verification and smoke checks after deployment, with rollback on failure.
- **Out-of-Scope**:
  - Product feature changes in the application itself.
  - Replacing GitHub Actions as the CI/CD platform.
  - Advanced progressive delivery features such as canary orchestration or service mesh traffic splitting.
  - Changes to registry provisioning, cluster provisioning, or cloud account setup.

## 3. Acceptance Criteria (AC)
- [ ] **AC1**: The build pipeline produces an immutable image reference in the form `registry/name@sha256:...` and exposes it as a job output.
- [ ] **AC2**: The deploy pipeline consumes the immutable image reference from the build job and does not reconstruct the image from a mutable tag.
- [ ] **AC3**: The deploy pipeline verifies that the image manifest exists in the registry before applying Kubernetes manifests.
- [ ] **AC4**: The Kubernetes manifest rendered for deployment contains the exact immutable image reference that was produced by the build job.
- [ ] **AC5**: Deployment fails fast if the image manifest cannot be verified after retries, rather than applying a manifest that points to a missing artifact.
- [ ] **AC6**: After `kubectl apply`, the pipeline waits for rollout completion and runs smoke checks.
- [ ] **AC7**: If rollout or smoke checks fail, the pipeline marks the deployment as failed and triggers rollback behavior according to the workflow design.

## 4. Non-Functional Requirements
- **Reliability**: The deployment flow must be deterministic and repeatable for the same source revision and built artifact.
- **Traceability**: The workflow must make it easy to trace a running deployment back to the exact build output and source revision.
- **Safety**: The pipeline must not rely on mutable tags for production deployment decisions.
- **Observability**: Workflow logs should clearly show the branch, commit SHA, and immutable image reference used for deployment.
- **Maintainability**: The design should keep image rendering simple and centralized so the placeholder replacement logic is easy to review and test.

## 5. Notes
- This requirement is the product-level source for the design in `docs/Design/design-immutable-images.md`.
- The implementation should follow the existing staging and production workflow structure and keep the deployment manifest template minimal.
