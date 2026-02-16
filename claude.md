# Claude-Assisted Changes

This document tracks significant changes made with Claude Code assistance to help future maintainers understand the context and rationale.

## Chrome Sidecar Removal (February 2026)

### Overview
Removed the chrome sidecar container from the Tekton pipeline configuration as part of infrastructure simplification.

### Changes Made

#### `.tekton/learning-resources-pull-request.yaml`
- **Removed**: `chrome-port: "9912"` parameter - no longer needed without the sidecar
- **Updated**: Frontend proxy routes configmap reference from `learning-resources-dev-proxy-caddyfile` to `learning-resources-dev-proxy-caddyfile-v2`
- **Updated**: Test app Caddyfile configmap reference from `learning-resources-test-app-caddyfile` to `learning-resources-test-app-caddyfile-v2`
- **Updated**: Pipeline reference to point to `catastrophe-brandon/konflux-pipelines` branch `btweed/remove-chrome-sidecar` (temporary fork with sidecar removal support)

### Context for Maintainers

The chrome sidecar was previously used during pipeline execution to provide the Insights chrome shell for testing. The removal indicates a shift in how chrome is handled during the test phase - now using the actual deployed chrome service via environment variable routing.

The v2 configmap references suggest that proxy routing configurations were updated to accommodate this architectural change. Future maintainers should be aware that:
- Tests no longer rely on a local chrome sidecar
- Proxy configurations (v2 versions) handle chrome routing differently, using `{env.HCC_ENV_URL}` to proxy to the actual stage environment
- The pipeline fork reference may need to be updated once changes are merged upstream to `RedHatInsights/konflux-pipelines`
- **Required Vault secrets**: The pipeline requires `e2e-hcc-env-url` and `e2e-stage-actual-hostname` to be set in vault at `creds/konflux/learning-resources`

### Issues Discovered and Fixed

#### Issue 1: Missing environment variables in run-application sidecar
During initial testing, e2e tests failed with authentication errors. The root cause was that the `run-application` sidecar (which uses `learning-resources-test-app-caddyfile-v2`) did not have access to the `HCC_ENV_URL` environment variable needed for chrome redirects.

**Fix applied**: Added `HCC_ENV_URL` and `STAGE_ACTUAL_HOSTNAME` environment variables to the `run-application` sidecar in `konflux-pipelines/pipelines/platform-ui/docker-build-run-all-tests.yaml`. These environment variables are sourced from the `e2e-credentials-secret` Kubernetes secret, which is populated from vault.

#### Issue 2: Caddy not expanding {env.HCC_ENV_URL} placeholders
After fixing the environment variables, tests still failed with 502 Bad Gateway errors. The ConfigMap routes contained `{env.HCC_ENV_URL}` placeholders that Caddy was not expanding to the actual URL value, causing all proxied routes to fail.

**Fix applied**: Modified the frontend-dev-proxy script to use shell variable substitution (`sed`) to replace `{env.HCC_ENV_URL}` with the actual URL value before injecting the routes into the Caddyfile. This matches how the catch-all reverse_proxy route works and ensures all routes have concrete URLs rather than unresolved placeholders.

### Related Files
- `.tekton/learning-resources-pull-request.yaml` - Pipeline configuration

### Branch
`btweed/remove-chrome-sidecar`
