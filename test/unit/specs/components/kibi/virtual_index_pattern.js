define(function (require) {
  describe('Kibi Components', function () {
    describe('Virtual Index Pattern', function () {
      var _ = require('lodash');
      var indexPattern;
      var VirtualIndex;

      beforeEach(function () {
        module('kibana');

        inject(function (Private) {
          VirtualIndex = Private(require('components/kibi/virtual_index_pattern/virtual_index_pattern'));
          indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        });
      });

      it('should be a virtual field', function () {
        var vip = new VirtualIndex(indexPattern);
        var field = {
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
});
