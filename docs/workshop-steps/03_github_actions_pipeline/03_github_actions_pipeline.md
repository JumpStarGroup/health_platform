---
title: 'Exercise 03: Build and deploy a GitHub Actions CI/CD pipeline'
layout: default
nav_order: 4
has_children: true
---

# Exercise 03: Build and deploy a GitHub Actions CI/CD pipeline

## Scenario

This training uses Copilot to help you deliver changes to the Health Platform through a complete engineering loop: local development → tests → pull request → automated deployment.

Unlike the previous (legacy) workshop version, **you do not create your own Azure resources**. A workshop admin pre-provisions a **shared AKS cluster**. Each learner deploys the app to the same cluster but to an isolated **namespace derived from the Git branch name**.

In this exercise, you will run the existing GitHub Actions workflow to build and push images to **GHCR**, then automatically deploy both backend and frontend to **AKS**. The frontend is exposed via **LoadBalancer** for simple access validation.

The system version displayed on the login page is unified across backend and frontend. It is served by **GET /api/v1/version**, which reads the repository **VERSION** file that is baked into the backend image during the build. If you update the version, rebuild and redeploy to reflect the change.

## Objectives

After completing this exercise, you'll be able to:

* Run a GitHub Actions CI/CD pipeline (workflow) that builds and deploys the app to AKS
* Validate deployment isolation using **branch = namespace**
* Find the resulting images in **GitHub Container Registry (GHCR)**
* Confirm the frontend is reachable via **LoadBalancer**
* Troubleshoot workflow failures using logs and Kubernetes signals

## Duration

* **Estimated Time:** 60 minutes
