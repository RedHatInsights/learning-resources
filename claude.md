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

The chrome sidecar was previously used during pipeline execution to provide the Insights chrome shell for testing. The removal indicates a shift in how chrome is handled during the test phase - likely now using the actual deployed chrome service or mocking it differently.

The v2 configmap references suggest that proxy routing configurations were updated to accommodate this architectural change. Future maintainers should be aware that:
- Tests no longer rely on a local chrome sidecar
- Proxy configurations (v2 versions) handle chrome routing differently
- The pipeline fork reference may need to be updated once changes are merged upstream to `RedHatInsights/konflux-pipelines`

### Related Files
- `.tekton/learning-resources-pull-request.yaml` - Pipeline configuration

### Branch
`btweed/remove-chrome-sidecar`
