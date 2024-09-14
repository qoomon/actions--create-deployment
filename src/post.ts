import * as core from '@actions/core'
import * as github from '@actions/github'
// see https://github.com/actions/toolkit for more GitHub actions libraries
import {getInput, run} from '../lib/actions'
import {fileURLToPath} from 'url'
import {DeploymentStatus, getLatestDeploymentStatus, parseRepository} from '../lib/github';
import {z} from "zod";

const state = {
  deploymentId: core.getState('deployment-id') ? parseInt(core.getState('deployment-id'), 10) : undefined,
}

export const action = () => run(async () => {
  const inputs = {
    token: getInput('token', {required: true}),
    repository: getInput('repository', {required: true}),
    autoClose: getInput('auto-close', z.boolean()),
    jobStatus: getInput('#job-status', {required: true}, z.enum(['success', 'failure', 'cancelled'])),
  }

  if (!inputs.autoClose) {
    core.debug('Skip Auto Close - Auto close is disabled')
    return;
  }

  if (!state.deploymentId) {
    core.debug('Skip Auto Close - No deployment to close')
    return;
  }

  const octokit = github.getOctokit(inputs.token)

  // https://docs.github.com/en/rest/deployments/deployments?apiVersion=2022-11-28#create-a-deployment
  const currentDeploymentStatus = await getLatestDeploymentStatus(octokit, inputs.repository, state.deploymentId)
  if (currentDeploymentStatus?.state !== 'in_progress') {
    core.debug('Skip Auto Close - Deployment state is not in_progress')
    return;
  }

  const deploymentStatusState: DeploymentStatus = inputs.jobStatus === 'success'
      ? 'success'
      : 'failure';
  core.info(`Create deployment status '${deploymentStatusState}'`)
  await octokit.rest.repos.createDeploymentStatus({
    ...parseRepository(inputs.repository),
    deployment_id: state.deploymentId,
    state: deploymentStatusState,

    environment: currentDeploymentStatus.environment,
    environment_url: currentDeploymentStatus.environment_url,

    log_url: currentDeploymentStatus.log_url,
    auto_inactive: deploymentStatusState === 'success',
  })
})

// Execute the action, if running as the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  action()
}
