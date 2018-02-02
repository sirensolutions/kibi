import { IsRequestProvider } from './is_request';
import { ReqStatusProvider } from './req_status';
import { each } from 'lodash';

export function MergeDuplicatesRequestProvider(Private) {
  const isRequest = Private(IsRequestProvider);
  const DUPLICATE = Private(ReqStatusProvider).DUPLICATE;

  function mergeDuplicateRequests(requests) {
    // dedupe requests
    const sourceRequestMap = {};
    const updateList = {};
    const requestObjs = [];

    // kibi: if there is a duplicated request, use request source with resp or _mergedResp
    for(let i = 0; i < requests.length; i++) {
      if (!isRequest(requests[i])) {
        requestObjs[i] = requests[i];
      }

      const iid = requests[i].source._instanceid;
      if(!sourceRequestMap.hasOwnProperty(iid)) {
        sourceRequestMap[iid] = i;
        requestObjs[i] = requests[i];
      } else {
        if(requests[sourceRequestMap[iid]].resp || requests[sourceRequestMap[iid]]._mergedResp) {
          requests[i]._uniq = requests[sourceRequestMap[iid]];
          requestObjs[i] = DUPLICATE;
        } else if (requests[i].resp  || requests[i]._mergedResp) {
          requests[sourceRequestMap[iid]]._uniq =  requests[i];
          requestObjs[sourceRequestMap[iid]] = DUPLICATE;
          requestObjs[i] = requests[i];
          each(updateList[sourceRequestMap[iid]], function (updateReq) {
            requests[updateReq]._uniq =  requests[i];
            requestObjs[updateReq] = DUPLICATE;
          });
          delete updateList[sourceRequestMap[iid]];
          sourceRequestMap[iid] = i;
        } else {
          if(!updateList.hasOwnProperty(sourceRequestMap[iid])) {
            updateList[sourceRequestMap[iid]] = [i];
          } else {
            updateList[sourceRequestMap[iid]].push(i);
          }
        }
      }
    }
    return requestObjs;
    // kibi: end
  }

  return mergeDuplicateRequests;
}
