const ngMock = require('ngMock');
const expect = require('expect.js');

describe('Kibi Components', function () {
  describe('Virtual Index Pattern', function () {
    const _ = require('lodash');
    let indexPattern;
    let VirtualIndex;

    beforeEach(function () {
      ngMock.module('kibana');

      ngMock.inject(function (Private) {
        VirtualIndex = Private(require('ui/kibi/components/commons/virtual_index_pattern'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      });
    });

    it('should be a virtual field', function () {
      const vip = new VirtualIndex(indexPattern);
      const field = {
        analyzed: false,
        bucketable: true,
        count: 0,
        displayName: 'aaa',
        name: 'aaa',
        scripted: false,
        sortable: false,
        type: 'string'
      };

      vip.addVirtualField(field);
      expect(_.where(vip.fields, { name: 'aaa' })).not.to.be(undefined);
      expect(_.where(indexPattern.fields, { name: 'aaa' })).to.eql([]);
      expect(vip.fields).to.have.length(indexPattern.fields.length + 1);
    });
  });
});
