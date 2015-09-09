define(function (require) {

  var replace_or_add_join_filter = require('components/sindicetech/join_filter_helper/lib/replace_or_add_join_filter');

  describe('Kibi Components', function () {

    describe('replace_or_add_join_filter', function () {

      it('add to empty and strip meta', function () {
        var filters = [];
        var joinFilter = {
          join: {},
          meta: {}
        };
        var expected = [{
          join: {}
        }];
        replace_or_add_join_filter(filters, joinFilter, true);
        expect(filters).to.eql(expected);
      });

      it('add to empty and do not strip meta', function () {
        var filters = [];
        var joinFilter = {
          join: {},
          meta: {}
        };
        var expected = [{
          join: {},
          meta: {}
        }];
        replace_or_add_join_filter(filters, joinFilter, false);
        expect(filters).to.eql(expected);
      });

      it('replace', function () {
        var filter1 = {
          join: {},
          meta: {label: '1'}
        };
        var filter2 = {
          join: {},
          meta: {label: '2'}
        };

        var filters = [filter1];
        var expected = [filter2];
        replace_or_add_join_filter(filters, filter2, false);
        expect(filters).to.eql(expected);
      });

      it('replace and strip meta', function () {
        var filter1 = {
          join: {indexes:['index1']},
          meta: {label: '1'}
        };
        var filter2 = {
          join: {indexes:['index2']},
          meta: {label: '2'}
        };

        var filters = [filter1];
        var expected = [{
          join:{indexes:['index2']}
        }];
        replace_or_add_join_filter(filters, filter2, true);
        expect(filters).to.eql(expected);
      });

    });

  });
});
