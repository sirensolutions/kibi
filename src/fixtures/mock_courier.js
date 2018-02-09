import sinon from 'sinon';
import { stubbedLogstashIndexPatternService } from 'fixtures/stubbed_logstash_index_pattern';
import { stubbedSavedObjectIndexPattern } from 'fixtures/stubbed_saved_object_index_pattern';
import { SavedObjectProvider } from 'ui/courier/saved_object/saved_object';

export default function (Private, Promise) {
  const indexPatterns = Private(stubbedLogstashIndexPatternService);
  const getIndexPatternStub = sinon.stub()
    .returns(Promise.resolve(indexPatterns));
  const SavedObject = Private(SavedObjectProvider);

  const courier = {
    indexPatterns: { get: getIndexPatternStub },
    getStub: getIndexPatternStub,
    SavedObject: SavedObject
  };

  return courier;
}
