# Tekton Pipeline Configuration

## Overview

This directory contains the Tekton PipelineRun configuration for the learning-resources application. The pipeline builds, tests, and runs end-to-end tests against the application in a Konflux environment.

## Architecture

The pipeline uses a custom pipeline definition from the `konflux-pipelines` repository:
- Repository: https://github.com/catastrophe-brandon/konflux-pipelines
- Branch: `btweed/externalize-caddy-configs`
- Pipeline: `pipelines/platform-ui/docker-build-run-all-tests.yaml`

## Key Parameters

### Application Configuration
- **test-app-name**: Name of the application being tested (default: `learning-resources`)
- **test-app-port**: Port where the test application runs (default: `8000`)
- **chrome-port**: Port for the Chrome/proxy services (default: `9912`)

### Caddy Configuration

Caddy configuration is now managed through externally-maintained ConfigMaps rather than being generated dynamically in the pipeline:

#### test-app-caddyfile (ConfigMap)
Contains the Caddyfile configuration for the test application server. This ConfigMap is:
- Named: `learning-resources-test-app-caddyfile`
- Mounted to: `/etc/caddy` in the `run-application` sidecar
- Managed externally (not defined in the pipeline)

#### frontend-proxy-routes-configmap
References the ConfigMap containing the Caddyfile configuration for the frontend proxy:
- ConfigMap name: `learning-resources-dev-proxy-caddyfile`
- Contains proxy routing rules and reverse proxy configurations
- Managed externally (not defined in the pipeline)

## How It Works

### Build and Test Flow

1. **Build Phase**: Application is built into a container image
2. **Run Application Sidecar**:
   - Mounts the `learning-resources-test-app-caddyfile` ConfigMap to `/etc/caddy`
   - Executes `run-app-script` which starts Caddy using the mounted Caddyfile
   - Caddy server runs on port 8000 serving the application
3. **Proxy Setup**:
   - Uses the `learning-resources-dev-proxy-caddyfile` ConfigMap for proxy configuration
   - Starts reverse proxy on port 1337
4. **E2E Tests**:
   - Waits for dev server to be ready at `https://stage.foo.redhat.com:1337`
   - Runs Playwright tests against the application

### ConfigMap-Based Configuration

The pipeline now uses a simpler approach:
- Caddy configuration is stored in external ConfigMaps managed outside the pipeline
- The `run-app-script` simply starts Caddy with the ConfigMap-mounted Caddyfile
- No dynamic generation or validation of routes within the pipeline
- Configuration changes are made by updating the ConfigMaps, not the pipeline definition

## Customization

To use this pipeline for a different application:

1. Update `test-app-name` to your application name
2. Adjust ports if needed (`test-app-port`, `chrome-port`)
3. Create or update ConfigMaps with appropriate Caddy configuration:
   - Create a ConfigMap for the test app Caddyfile (e.g., `<app-name>-test-app-caddyfile`)
   - Create a ConfigMap for the proxy Caddyfile (e.g., `<app-name>-dev-proxy-caddyfile`)
   - Update the `frontend-proxy-routes-configmap` parameter to reference your proxy ConfigMap
   - Update the `taskRunSpecs.sidecarSpecs.volumeMounts` to reference your test app ConfigMap

### Modifying Routes

To change application routes or proxy behavior:
1. Edit the appropriate ConfigMap in your Kubernetes/Konflux environment
2. Update the Caddyfile content within the ConfigMap
3. The changes will be picked up on the next pipeline run

## Security

Security considerations for Caddy configuration:
- Caddyfile validation is handled by Caddy itself when it starts
- Route security should be enforced in the ConfigMap Caddyfiles
- Follow Caddy best practices for secure reverse proxy configuration

## Related Documentation

- Konflux Pipelines: https://github.com/RedHatInsights/konflux-pipelines/blob/main/pipelines/platform-ui/README.md
- Caddy Documentation: https://caddyserver.com/docs/
