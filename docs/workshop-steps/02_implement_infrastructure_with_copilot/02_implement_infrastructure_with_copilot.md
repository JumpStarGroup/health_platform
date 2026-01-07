---
title: 'Exercise 02: Implement infrastructure with Copilot'
layout: default
nav_order: 3
has_children: true
---

# Exercise 02: Implement infrastructure with Copilot

## Scenario

This training will have you using Copilot features for development and also to automate DevOps delivery for the Health Platform solution for JumpStarX.

In the previous exercise you set up your development environment with the current state of the Health Platform web application and installed Visual Studio Code extensions to support DevOps automation.

In this workshop version, the cloud infrastructure is **prepared by the workshop admin**. Learners do **not** create or deploy Azure infrastructure.

In this exercise, you will use Copilot to understand the deployment model and prerequisites for a **shared AKS cluster**. You will review what the admin must configure (GitHub Environments/Secrets, GHCR pull credentials, and namespace guardrails) and what learners will do later (branch-based deployments).

## Objectives

After completing this exercise, you'll be able to:

* Understand the workshop deployment model: **shared AKS** with **branch = namespace**
* Identify the admin-managed prerequisites (GitHub Environments/Secrets, GHCR pull token)
* Explain why namespace-level guardrails (ResourceQuota + LimitRange) are enabled
* Prepare to validate automated deployments in the next exercise

## Duration

* **Estimated Time:** 60 minutes
