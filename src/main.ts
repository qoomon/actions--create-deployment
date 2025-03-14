import * as core from '@actions/core'
import * as github from '@actions/github'
import {context, getInput, getCurrentJob, run, addJobState} from '../lib/actions'
import {fileURLToPath} from 'url'
import {DeploymentStatusSchema, parseRepository} from '../lib/github';
import process from "node:process";
import {z} from "zod";

export const action = run(async () => {
  const inputs = {
    token: getInput('token', {required: true}),
    repository: getInput('repository', {required: true}),
    ref: getInput('ref', {required: true}),
    task: getInput('task'),
    state: getInput('state', DeploymentStatusSchema) ?? 'in_progress',
    environment: getInput('environment', {required: true}),
    environmentUrl: getInput('environment-url', z.string().url()),
    transientEnvironment: getInput('transient-environment', z.boolean()),
    productionEnvironment: getInput('production-environment', z.boolean()),
    description: getInput('description'),
    payload: getInputTryJson('payload'),
    autoInactive: getInput('auto-inactive', z.boolean()),
    logUrl: getInput('log-url', z.string().url()),
  };

  const octokit = github.getOctokit(inputs.token);

  if (!inputs.logUrl) {
    const currentJob = await getCurrentJob(octokit)
        .catch((error) => {
          core.warning(error.message);
          return null;
        });
    inputs.logUrl = currentJob?.html_url || getWorkflowRunHtmlUrl(context);
  }

  core.info(`Create deployment for environment ${inputs.environment}`);
  // https://docs.github.com/en/rest/deployments/deployments?apiVersion=2022-11-28#create-a-deployment
  const {data: deployment} = await octokit.rest.repos.createDeployment({
    ...parseRepository(inputs.repository),
    ref: inputs.ref,
    // --- optional parameters ---
    required_contexts: [], // TODO
    task: inputs.task,
    environment: inputs.environment,
    transient_environment: inputs.transientEnvironment,
    production_environment: inputs.productionEnvironment,
    description: inputs.description,
    payload: inputs.payload,
    auto_merge: false,
  });
  if (!('id' in deployment)) {
    core.setFailed(deployment.message ?? 'Failed to create create-deployment');
    return
  }

  core.saveState('deployment-id', deployment.id);
  core.setOutput('deployment-id', deployment.id);
  addJobState({repository: inputs.repository, deploymentId: deployment.id})

  core.info(`Create deployment status '${inputs.state}'`);
  await octokit.rest.repos.createDeploymentStatus({
    ...parseRepository(inputs.repository),
    deployment_id: deployment.id,
    state: inputs.state,

    log_url: inputs.logUrl,

    auto_inactive: inputs.autoInactive ?? false,
    environment_url: inputs.environmentUrl,
  });
})

function getWorkflowRunHtmlUrl(context: {
  serverUrl: string,
  repo: { owner: string; repo: string };
  runId: number,
  runAttempt?: number
}) {
  return `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}` +
      (context.runAttempt ? `/attempts/${context.runAttempt}` : '');
}

function getInputTryJson(name: string, options?: core.InputOptions) {
  const input = getInput(name, options);
  if (!input) return undefined;

  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

// Execute the action, if running as the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  action();
}
