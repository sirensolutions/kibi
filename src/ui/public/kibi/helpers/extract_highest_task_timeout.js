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
    if(obj.hasOwnProperty(key)){
      const found = findPath(obj[key], keyName, path === '' ? key : path + '.' + key);
      if (found) {
        return found;
      }
    }
  }
  return null;
};


export function extractHighestTaskTimeout(body) {
  const lines = body.split('\n');
  let taskTimeout = 0;
  for (let i = 0; i < lines.length; i++) {
    // parse line
    const line = lines[i];
    try {
      const query = JSON.parse(line);
      const taskTimeoutCandidatePath = findPath(query, 'task_timeout', '');
      if (taskTimeoutCandidatePath) {
        const taskTimeoutCandidate = get(query, taskTimeoutCandidatePath);
        if (taskTimeoutCandidate > taskTimeout) {
          console.log('got value ' + taskTimeoutCandidate)
          taskTimeout = taskTimeoutCandidate
        }
        unset(query, taskTimeoutCandidatePath);
        lines[i] = JSON.stringify(query);
      }
    } catch(e) {
      console.log('Could not parse line: ')
      console.log(line);
    }
  }
  return {
    taskTimeout,
    body: lines.join('\n')
  };
}

