import IndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import VirtualIndexPatternProvider from 'ui/kibi/components/commons/virtual_index_pattern';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import _ from 'lodash';

describe('Kibi Components', function () {
  describe('Virtual Index Pattern', function () {
    let indexPattern;
    let VirtualIndexPattern;

    beforeEach(function () {
      ngMock.module('kibana');

      ngMock.inject(function (Private) {
        VirtualIndexPattern = Private(VirtualIndexPatternProvider);
        indexPattern = Private(IndexPatternProvider);
      });
    });

    it('should be a virtual field', function () {
      const virtualField = {
        analyzed: false,
        bucketable: true,
        count: 0,
        displayName: 'aaa',
        name: 'aaa',
        scripted: false,
        sortable: false,
        type: 'string'
      };
      const vip = new VirtualIndexPattern(indexPattern, virtualField);

      expect(_.where(vip.fields, { name: 'aaa' })).not.to.be(undefined);
      expect(_.where(indexPattern.fields, { name: 'aaa' })).to.eql([]);
      expect(vip.fields).to.have.length(indexPattern.fields.length + 1);
    });
  });
});
