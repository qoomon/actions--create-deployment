# Create Deployment &nbsp; [![Actions](https://img.shields.io/badge/qoomon-GitHub%20Actions-blue)](https://github.com/qoomon/actions)

This action will create a new deployment via GitHub API.
By default, the deployment is created with the status `in_progress`
and will be closed  automatically at the end of job the deployment with status `success` or `failure` depending on the job status.

### Example

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: qoomon/actions--deployment@v1
        with:
          message: work work
          skip-empty: true

      - if: ${{ steps.commit.outputs.commit != null }}
        run: git push
```

### Inputs

```yaml
inputs:
  message:
    description: 'The commit message'
    required: true
  amend:
    description: 'Amend the last commit'
    default: false
  allow-empty:
    description: 'Allow an empty commit'
    default: false
  skip-empty:
    description: 'Skip action, if nothing to commit'
    default: false

  token:
    description: 'A GitHub access token'
    required: true
    default: ${{ github.token }}
  working-directory:
    description: 'The working directory'
    required: true
    default: '.'
  remoteName:
    description: 'The remote name to create the commit at.'
    required: true
    default: 'origin'
```

### Outputs

```yaml
outputs:
  commit:
    description: 'The commit hash, if a commit was created'
```

## Development

### Release New Action Version

Trigger [Release Version workflow](/actions/workflows/action-release.yaml)
