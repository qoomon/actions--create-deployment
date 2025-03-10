import * as core from '@actions/core'
import * as github from '@actions/github'
import {context, getInput, getJobState, run} from '../../lib/actions'
import {fileURLToPath} from 'url'
import {
  DeploymentStatusSchema,
  getLatestDeploymentStatus,
  getWorkflowRunHtmlUrl,
  parseRepository
} from '../../lib/github';
import process from "node:process";
import {z} from "zod";

export const action = () => run(async () => {
  const jobState = getJobState<{ repository: string, deploymentId: number }>();

  let inputRepository = getInput('repository');
  let inputDeploymentId = getInput('deployment-id', z.number().min(1));

  if (inputDeploymentId) {
    if (!inputRepository) {
      const matchingJobState = jobState
          .filter((entry) => entry.deploymentId === inputDeploymentId)

      if (matchingJobState.length === 0) {
        inputRepository = context.repository
      } else if (matchingJobState.length === 1) {
        inputRepository = matchingJobState[0].repository;
      } else {
        throw new Error('Ambiguous deployments found for current job. Input required: repository');
      }
    }
  } else {
    if (inputRepository) {  // && !inputDeploymentId
      throw new Error('Input required: deployment-id');
    }

    if (jobState.length === 0) {
      throw new Error('No deployment found for current job. Input required: repository, deployment-id');
    }
    if (jobState.length > 1) {
      throw new Error('Ambiguous deployments found for current job. Input required: deployment-id');
    }

    inputDeploymentId = jobState[0].deploymentId;
    inputRepository = jobState[0].repository;
  }

  const inputs = {
    token: getInput('token', {required: true}),
    repository: inputRepository,
    deploymentId: inputDeploymentId,
    state: getInput('state', {required: true}, DeploymentStatusSchema),
    description: getInput('description'),
    logUrl: getInput('log-url', z.string().url()),
    environmentUrl: getInput('environment-url', z.string().url()),
    autoInactive: getInput('auto-inactive', z.boolean()),
  }

  const octokit = github.getOctokit(inputs.token)

  const currentDeploymentStatus = await getLatestDeploymentStatus(octokit, inputs.repository, inputs.deploymentId);

  core.info(`Create deployment status '${inputs.state}'`)
  await octokit.rest.repos.createDeploymentStatus({
    ...parseRepository(inputs.repository),
    deployment_id: inputs.deploymentId,
    state: inputs.state,
    // --- optional parameters ---
    log_url: inputs.logUrl || currentDeploymentStatus?.log_url || getWorkflowRunHtmlUrl(context), // TODO maybe get log_url from job getWorkflowJobRunHtmlUrl
    description: inputs.description,
    auto_inactive: inputs.autoInactive ?? inputs.state === 'success',

    environment: undefined, // keep the environment from last deployment status
    environment_url: inputs.environmentUrl || currentDeploymentStatus?.environment_url,
  })

  core.setOutput('deployment-id', inputs.deploymentId)
})

// Execute the action, if running as the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  action()
}
