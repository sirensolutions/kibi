import { IsRequestProvider } from './is_request';
import { ReqStatusProvider } from './req_status';
import { each } from 'lodash';

export function MergeDuplicatesRequestProvider(Private) {
  const isRequest = Private(IsRequestProvider);
  const DUPLICATE = Private(ReqStatusProvider).DUPLICATE;

  function mergeDuplicateRequests(requests) {
    // dedupe requests
    const sourceRequestMap = [];
    const requestObjs = [];

    // kibi: if there is a duplicated request, use request source with resp or _mergedResp
    for(let i = 0; i < requests.length; i++) {
      if (!isRequest(requests[i])) {
        requestObjs[i] = requests[i];
      }

      const iid = requests[i].source._instanceid;
      if(!sourceRequestMap[iid]) {
        sourceRequestMap[iid] = i;
        requestObjs[i] = requests[i];
      } else {
        if(requests[sourceRequestMap[iid]].source.resp || requests[sourceRequestMap[iid]].source._mergedResp) {
          requests[i]._uniq = requests[sourceRequestMap[iid]].source;
          requestObjs[i] = DUPLICATE;
        } else {
          requests[sourceRequestMap[iid]]._uniq =  requests[i].source;
          requestObjs[sourceRequestMap[iid]] = DUPLICATE;
          requestObjs[i] = requests[i];
          sourceRequestMap[iid] = i;
        }
      }
    }
    return requestObjs;
    // kibi: end
  }

  return mergeDuplicateRequests;
}
