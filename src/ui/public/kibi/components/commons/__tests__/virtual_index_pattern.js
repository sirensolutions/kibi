import IndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VirtualIndexPatternFactory } from 'ui/kibi/components/commons/virtual_index_pattern';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import _ from 'lodash';

describe('Kibi Components', function () {
  describe('Virtual Index Pattern', function () {
    let indexPattern;
    let VirtualIndexPattern;

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

    beforeEach(function () {
      ngMock.module('kibana');

      ngMock.inject(function (Private) {
        VirtualIndexPattern = Private(VirtualIndexPatternFactory);
        indexPattern = Private(IndexPatternProvider);
      });
    });

    it('should be a virtual field', function () {
      const vip = new VirtualIndexPattern(indexPattern, virtualField);

      expect(_.where(vip.fields, { name: 'aaa' })).not.to.be(undefined);
      expect(_.where(indexPattern.fields, { name: 'aaa' })).to.eql([]);
      expect(vip.fields).to.have.length(indexPattern.fields.length + 1);
    });

    it('should quack', function () {
      const vip = new VirtualIndexPattern(indexPattern, virtualField);
      expect(vip.toIndexList).not.to.be(undefined);
    });
  });
});
