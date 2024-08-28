import * as core from '@actions/core'
import * as github from '@actions/github'
import {context, getInput, run} from '../lib/actions.js'
import {fileURLToPath} from 'url'
import {DeploymentStatusSchema, getLatestDeploymentStatus, getWorkflowRunHtmlUrl, parseRepository} from '../lib/github';
import process from "node:process";
import * as fs from "node:fs";
import {deploymentsFilePath} from "../config";
import {z} from "zod";
import {JsonTransformer} from "../lib/common";

export const action = () => run(async () => {
  const inputs = {
    token: getInput('token', {required: true}),
    repository: getInput('repository', {required: true}), // TODO get from file
    deploymentId: getInput('deployment-id', JsonTransformer.pipe(z.number().min(1) )) ?? await getDeploymentIdFromJobState(),
    state: getInput('state', {required: true}, DeploymentStatusSchema),
    description: getInput('description'),
    logUrl: getInput('log-url', z.string().url()),
    environmentUrl: getInput('environment-url',z.string().url()),
    autoInactive: getInput('auto-inactive', JsonTransformer.pipe(z.boolean())),
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

async function getDeploymentIdFromJobState() {
  core.warning('env: ' + JSON.stringify(process.env, null, 2))
  const jobDeployments = await fs.promises.readFile(deploymentsFilePath)
      .then((buffer) => buffer.toString().split('\n').filter(line => line.trim().length > 0));
  if (jobDeployments.length === 0) {
    throw new Error('No deployment - Input required: deployment-id');
  }
  if (jobDeployments.length > 1) {
    throw new Error('Ambiguous deployments - Input required: deployment-id');
  }
  return parseInt(jobDeployments[0], 10);
}

// Execute the action, if running as the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  action()
}
