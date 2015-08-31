define(function (require) {
  var isRetrieved = require('plugins/settings/sections/indices/retrieved_field');

  describe('Settings', function () {
    describe('Indices', function () {
      describe('isRetrieved(sourceFiltering, name)', function () {
        it('should be a function', function () {
          expect(isRetrieved).to.be.a(Function);
        });

        it('should retrieve john', function () {
          var sourceFiltering = {
            include: 'john'
          };

          expect(isRetrieved(sourceFiltering, 'john')).to.be(true);
        });

        it('should not retrieve connor', function () {
          var sourceFiltering = {
            exclude: 'connor'
          };

          expect(isRetrieved(sourceFiltering, 'connor')).to.be(false);
        });

        it('should not retrieve john.*.connor', function () {
          var sourceFiltering = {
            exclude: 'john.*.connor'
          };

          expect(isRetrieved(sourceFiltering, 'john.j.connor')).to.be(false);
          expect(isRetrieved(sourceFiltering, 'john.t.connor')).to.be(false);
          expect(isRetrieved(sourceFiltering, 'john.j.watterson')).to.be(true);
        });
      });
    });
  });
});
