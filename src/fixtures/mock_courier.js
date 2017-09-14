import sinon from 'sinon';
import { stubbedLogstashIndexPatternService } from 'fixtures/stubbed_logstash_index_pattern';

export default function (Private, Promise) {
  const indexPatterns = Private(stubbedLogstashIndexPatternService);
  const getIndexPatternStub = sinon.stub()
    .returns(Promise.resolve(indexPatterns));

  const courier = {
    indexPatterns: { get: getIndexPatternStub },
    getStub: getIndexPatternStub
  };

  return courier;
}
