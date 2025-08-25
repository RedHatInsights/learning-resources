# Tekton Pipeline Configuration

## Overview

This directory contains the Tekton PipelineRun configuration for the learning-resources application. The pipeline builds, tests, and runs end-to-end tests against the application in a Konflux environment.

## Architecture

The pipeline uses a custom pipeline definition from the `konflux-pipelines` repository:
- Repository: https://github.com/catastrophe-brandon/konflux-pipelines
- Branch: `btweed/platform-ui-e2e`
- Pipeline: `pipelines/platform-ui/docker-build-run-all-tests.yaml`

## Key Parameters

### Application Configuration
- **test-app-name**: Name of the application being tested (default: `learning-resources`)
- **test-app-port**: Port where the test application runs (default: `8000`)
- **chrome-port**: Port for the Chrome/proxy services (default: `9912`)

### Dynamic Route Generation

#### app-routes
Defines the frontend application routes that need Caddyfile handlers. Uses `test-app-name` parameter for dynamic path construction.

Example:
```yaml
- name: app-routes
  value: |
    /$(params.test-app-name)
    /settings/$(params.test-app-name)
    /openshift/$(params.test-app-name)
```

The `run-app-script` processes these routes and dynamically generates Caddyfile configuration with:
- Route validation (path traversal prevention, character validation)
- Matcher name generation
- Handle directives for exact matches and subpaths

#### frontend-proxy-routes
Comma-separated path,port pairs that define proxy routing configuration.

Format: `path,port`

Example:
```yaml
- name: frontend-proxy-routes
  value: |
    /,$(params.chrome-port)
    /apps/$(params.test-app-name)*,$(params.test-app-port)
    /settings/$(params.test-app-name)*,$(params.chrome-port)
```

#### proxy-routes-script
A shell script that generates Caddyfile proxy routes from `frontend-proxy-routes`. The script:
1. Parses comma-separated path,port pairs
2. Validates routes and ports
3. Generates Caddyfile `handle` directives with appropriate `reverse_proxy` targets
4. Outputs the configuration to be consumed by the proxy server

## How It Works

### Build and Test Flow

1. **Build Phase**: Application is built into a container image
2. **Run Application Sidecar**:
   - Executes `run-app-script` which generates dynamic Caddyfile routes from `app-routes`
   - Starts Caddy server on port 8000 serving the application
3. **Proxy Setup**:
   - Executes `proxy-routes-script` to generate proxy configuration
   - Writes output to `/config/routes`
   - Starts reverse proxy on port 1337
4. **E2E Tests**:
   - Waits for dev server to be ready at `https://stage.foo.redhat.com:1337`
   - Runs Playwright tests against the application

### Script Execution Pattern

Both `run-app-script` and `proxy-routes-script` follow a pattern:
- Receive parameterized input (routes with Tekton variable interpolation)
- Validate inputs for security (prevent path traversal, injection attacks)
- Generate Caddyfile configuration dynamically
- Output/apply the configuration

## Customization

To use this pipeline for a different application:

1. Update `test-app-name` to your application name
2. Modify `app-routes` to match your frontend routes
3. Update `frontend-proxy-routes` with appropriate proxy mappings
4. Adjust ports if needed (`test-app-port`, `chrome-port`)

## Security

Both route generation scripts include validation:
- Routes must start with `/`
- No path traversal attempts (`..`)
- Character allowlist (alphanumeric, `/`, `-`, `_`, `*`, `.`)
- No double slashes
- Port range validation (1-65535)

## Related Documentation

- Konflux Pipelines: `/Users/btweed/repos/konflux-pipelines/pipelines/platform-ui/README.md`
- Caddy Documentation: https://caddyserver.com/docs/
