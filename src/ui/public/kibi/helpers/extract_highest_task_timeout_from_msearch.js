import { get } from 'lodash';
import unset from 'ui/kibi/lodash4/unset';

export function findPath(obj, keyName, path) {
  if (!obj || (obj && typeof obj !== 'object')) {
    return null;
  }
  if(obj[keyName]) {
    return path === '' ?  keyName : path + '.' + keyName;
  }
  for(const key in obj) {
    if(obj.hasOwnProperty(key)) {
      const found = findPath(obj[key], keyName, path === '' ? key : path + '.' + key);
      if (found) {
        return found;
      }
    }
  }
  return null;
};


export function extractHighestTaskTimeoutFromMsearch(body) {
  const lines = body.split('\n');
  let taskTimeout = 0;
  // we iterate every second line as the body should be valid msearch in format of
  // meta \n
  // query \n
  for (let i = 1; i < lines.length; i = i + 2) {
    // parse line
    const line = lines[i];
    try {
      const query = JSON.parse(line);
      const taskTimeoutCandidatePath = findPath(query, 'task_timeout', '');
      if (taskTimeoutCandidatePath) {
        const taskTimeoutCandidate = get(query, taskTimeoutCandidatePath);
        if (taskTimeoutCandidate > taskTimeout) {
          taskTimeout = taskTimeoutCandidate;
        }
        unset(query, taskTimeoutCandidatePath);
        lines[i] = JSON.stringify(query);
      }
    } catch(e) {
      if (console) {
        console.log('Could not parse line: '); // eslint-disable-line no-console
        console.log(line); // eslint-disable-line no-console
      }
    }
  }
  return {
    taskTimeout,
    body: lines.join('\n')
  };
}

