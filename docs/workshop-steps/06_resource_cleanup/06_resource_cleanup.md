---
title: 'Exercise 06: Resource cleanup'
layout: default
nav_order: 7
has_children: true
---

# Exercise 06: Resource cleanup

## Scenario

Congratulations! You have completed all the exercises in this training.

In this workshop model, learners deploy to a **shared AKS cluster** using a **namespace derived from their Git branch name**. To avoid unnecessary costs and resource exhaustion (e.g., public IPs for LoadBalancers), the workshop admin should clean up environments **by deleting namespaces** created for the workshop.

Optionally, the admin may also clean up related GitHub artifacts (such as old container image tags in GHCR) depending on retention policies.

## Objectives

After completing this exercise, you'll be able to:

* Clean up workshop environments by deleting branch namespaces in the shared AKS cluster
* Reclaim cluster resources (including LoadBalancer allocations) and keep the cluster ready for the next cohort
* Optionally clean up GHCR image tags based on the workshop retention policy

## Duration

* **Estimated Time:** 15 minutes
