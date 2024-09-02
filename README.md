# Create Deployment &nbsp; [![Actions](https://img.shields.io/badge/qoomon-GitHub%20Actions-blue)](https://github.com/qoomon/actions)

This action will create a new deployment via GitHub API.
By default, the deployment is created with the status `in_progress`
and will be closed  automatically at the end of job the deployment with status `success` or `failure` depending on the job status.

### Example

- Create a deployment for the current repository and ref with the environment `production`.
  Deployment will be closed automatically at the end of the job.
  ```yaml
  jobs:
    example:
      runs-on: ubuntu-latest
      steps:
        - uses: qoomon/actions--create-deployment@v1
          with:
            environment: production
  ```
- Create a deployment for the current repository and ref with the environment `production`.
  Set deployment status manually.
  ```yaml
  jobs:
    example:
      runs-on: ubuntu-latest
      steps:
        - uses: qoomon/actions--create-deployment@v1
          with:
            environment: production

        - run: echo "Deployment is in progress..."

        - uses: qoomon/actions--create-deployment/status@v1
          with:
            state: success
  ```

### Inputs

- action: qoomon/actions--create-deployment
  ```yaml
  inputs:
    token:
      description: 'A GitHub access token'
      required: true
      default: '${{ github.token }}'

    repository:
      description: 'The repository of the deployment'
      required: true
      default: '${{ github.repository }}'
    ref:
      description: 'The repository ref of the deployment'
      required: true
      default: '${{ github.ref }}'

    task:
      description: 'The task of the deployment'
      default: 'deploy'
    description:
      description: 'The description of the deployment'
    payload:
      description: 'The payload of the deployment'
    environment:
      description: 'The environment of the deployment'
    production-environment:
      description: 'Specifies if the given environment is specific to the deployment and will no longer exist at some point in the future. Default: `false`'
    transient-environment:
      description: 'Specifies if the given environment is one that end-users directly interact with. Default: `true` when `environment` is `production` and `false` otherwise.'

    # --- initial status ---
    state:
      description: The initial status of the deployment
      default: 'in_progress'
      required: true
    environment-url:
      description: 'The environment URL of the deployment'

    # --- post run ---
    auto-close:
      description: 'Enable auto-close for the deployment'
      default: 'true'
  ```
- action: qoomon/actions--create-deployment/**status**
  ```yaml
  inputs:
    token:
      description: 'A GitHub access token'
      required: true
      default: '${{ github.token }}'

    repository:
      description: 'The repository to target'
      required: true
      default: '${{ github.repository }}'
    deployment-id:
      description: 'The deployment id'

    state:
      description: |
        The status of the deployment
        Valid values are "error", "failure", "inactive", "in_progress", "queued", "pending", or "success"
    description:
      description: 'The description of the deployment status'
    environment:
      description: 'The environment of the deployment status'
    environment-url:
      description: 'The environment URL of the deployment status'
  ```

### Outputs

```yaml
outputs:
  deployment-id:
    description: 'The deployment id'
```

## Development

### Release New Action Version

Trigger [Release Version workflow](/actions/workflows/action-release.yaml)
