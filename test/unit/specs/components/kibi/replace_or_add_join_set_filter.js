define(function (require) {

  var replace_or_add_join_set_filter = require('components/sindicetech/join_filter_helper/lib/replace_or_add_join_set_filter');

  describe('Kibi Components', function () {

    describe('replace_or_add_join_set_filter', function () {

      it('add to empty and strip meta', function () {
        var filters = [];
        var joinFilter = {
          join_set: {},
          meta: {}
        };
        var expected = [{
          join_set: {}
        }];
        replace_or_add_join_set_filter(filters, joinFilter, true);
        expect(filters).to.eql(expected);
      });

      it('add to empty and do not strip meta', function () {
        var filters = [];
        var joinFilter = {
          join_set: {},
          meta: {}
        };
        var expected = [{
          join_set: {},
          meta: {}
        }];
        replace_or_add_join_set_filter(filters, joinFilter, false);
        expect(filters).to.eql(expected);
      });

      it('replace', function () {
        var filter1 = {
          join_set: {},
          meta: {label: '1'}
        };
        var filter2 = {
          join_set: {},
          meta: {label: '2'}
        };

        var filters = [filter1];
        var expected = [filter2];
        replace_or_add_join_set_filter(filters, filter2, false);
        expect(filters).to.eql(expected);
      });

      it('replace and strip meta', function () {
        var filter1 = {
          join_set: {indexes:['index1']},
          meta: {label: '1'}
        };
        var filter2 = {
          join_set: {indexes:['index2']},
          meta: {label: '2'}
        };

        var filters = [filter1];
        var expected = [{
          join_set:{indexes:['index2']}
        }];
        replace_or_add_join_set_filter(filters, filter2, true);
        expect(filters).to.eql(expected);
      });

    });

  });
});
