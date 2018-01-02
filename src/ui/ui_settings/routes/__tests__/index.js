import {
  startServers,
  stopServers,
} from './lib';

import { docExistsSuite } from './doc_exists';
import { docMissingSuite } from './doc_missing';
import { indexMissingSuite } from './index_missing';

describe('uiSettings/routes', function () {
  this.slow(2000);
  this.timeout(10000);

  // these tests rely on getting sort of lucky with
  // the healthcheck, so we retry if they fail
  this.retries(3);

  before(startServers);
  // kibi: The running order of the test suites below is important:
  // 1. indexMissingSuite
  // 2. docExistsSuite
  // 3. docMissingSuite
  // This avoids a timing but where docExistsSuite test suite was somehow still deleting the kibi index
  // while indexMissingSuite started running and was trying to query the kibi index. This caused an exception
  // to appear in elasticsearch. At some point we need to come back and try and understand this issue better.
  describe('index missing', indexMissingSuite);
  describe('doc exists', docExistsSuite);
  describe('doc missing', docMissingSuite);
  // kibi: end

  after(stopServers);
});
