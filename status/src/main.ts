import * as core from '@actions/core'
import * as github from '@actions/github'
import {context, getInput, run} from '../../lib/actions'
import {fileURLToPath} from 'url'
import {
  DeploymentStatusSchema,
  getLatestDeploymentStatus,
  getWorkflowRunHtmlUrl,
  parseRepository
} from '../../lib/github';
import process from "node:process";
import {z} from "zod";
import {getJobState} from "../../src/job-sate";

export const action = () => run(async () => {

  let inputDeploymentId = getInput('deployment-id', z.number().min(1));
  let inputRepository = getInput('repository');

  if(!inputRepository || !inputDeploymentId) {
    const jobState = getJobState<{ repository: string, deploymentId: number }>()
    if (jobState.length === 0) {
      throw new Error('No deployment found for current job - ' +
          'Input required: repository, deployment-id');
    }

    const matchingJobStateEntries = jobState.filter((entry) =>
        (!inputRepository || entry.repository === inputRepository) &&
        (!inputDeploymentId || entry.deploymentId === inputDeploymentId)
    )
    if (matchingJobStateEntries.length === 0) {
      throw new Error('No matching deployment found for current job with given inputs - ' +
          'Input: repository, deployment-id');
    }
    if (matchingJobStateEntries.length > 1) {
      throw new Error('Ambiguous deployments found for current job - ' +
          'Input required: deployment-id');
    }

    const matchingJobStateEntry = matchingJobStateEntries[0];
    if (inputRepository && matchingJobStateEntry.repository !== inputRepository) {
      throw new Error('Deployment repository mismatch - ' +
          'Input: repository');
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
