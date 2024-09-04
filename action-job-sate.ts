import {context} from './lib/actions.js';
import * as fs from "node:fs";

const STATE_FILE = `${context.runnerTempDir}/action--create-deployment`

export function addJobState(obj: object) {
  fs.appendFileSync(STATE_FILE, JSON.stringify(obj) + '\n');
}

export function getJobState<T extends object>() {
  if(!fs.existsSync(STATE_FILE)) return [];

  return fs.readFileSync(STATE_FILE).toString()
      .split('\n').filter(line => line.trim().length > 0)
      .map(line => JSON.parse(line)) as T[];
}
