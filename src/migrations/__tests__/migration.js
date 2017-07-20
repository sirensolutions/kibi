import expect from 'expect.js';
import sinon from 'sinon';
import Migration from '../migration';
import requirefrom from 'requirefrom';
const wrapAsync = requirefrom('src/testUtils')('wrap_async');

describe('migrations', function () {

  describe('Migration', function () {

    let client = {
      search: () => {},
      scroll: () => {},
      count: () => ({count: 15})
    };
    let configuration = {
      index: 'index',
      client: client
    };

    it('should check arguments at instantiation time', function () {
      expect(() => new Migration()).to.throwError();
      expect(() => new Migration(configuration)).not.to.throwError();
    });

    describe('countHits', function () {

      beforeEach(function () {
        sinon.spy(client, 'count');
      });

      it('should build the correct query and return the result', wrapAsync(async () => {
        let migration = new Migration(configuration);
        let index = 'index';
        let type = 'type';
        let query = {
          query: {
            match_all: {}
          }
        };

        let result = await migration.countHits(index, type, query);

        expect(result).to.be(15);
        expect(client.count.calledWith({
          index: index,
          type: type,
          body: query
        }));
      }));

      afterEach(function () {
        client.count.restore();
      });

    });

    describe('scrollSearch', function () {
      let search;
      let scroll;

      beforeEach(function () {
        search = sinon.stub(client, 'search', function (searchOptions) {
          if (searchOptions.index === 'empty') {
            return {
              _scroll_id: 'scroll_id',
              hits: {
                total: 0,
                hits: []
              }
            };
          }

          return {
            _scroll_id: 'scroll_id',
            hits: {
              total: 100,
              hits: new Array(10)
            }
          };
        });

        scroll = sinon.stub(client, 'scroll', function () {
          return {
            _scroll_id: 'scroll_id',
            hits: {
              total: 100,
              hits: new Array(10)
            }
          };
        });
      });

      it('should set default options if options have not been defined', wrapAsync(async () => {
        let migration = new Migration(configuration);
        await migration.scrollSearch('empty', 'type', {});

        expect(search.calledOnce);
        expect(search.calledWith(sinon.match({size: 100})));
      }));

      it('should set a default size if no size has been specified', wrapAsync(async () => {
        let migration = new Migration(configuration);
        await migration.scrollSearch('empty', 'type', {}, {});

        expect(search.calledOnce);
        expect(search.calledWith(sinon.match({size: 100})));
      }));

      it('should use the specified size', wrapAsync(async () => {
        let migration = new Migration(configuration);
        await migration.scrollSearch('empty', 'type', {}, {size: 1000});

        expect(search.calledOnce);
        expect(search.calledWith(sinon.match({size: 1000})));
      }));

      it('should use the scroll API to fetch hits', wrapAsync(async () => {
        let migration = new Migration(configuration);
        let index = 'index';
        let type = 'type';
        let query = {
          query: {
            match_all: {}
          }
        };
        let options = {
          size: 10
        };

        let results = await migration.scrollSearch(index, type, query, options);

        expect(search.calledOnce);
        expect(search.calledWith({
          index: index,
          type: type,
          scroll: '1m',
          size: options.size,
          body: query
        }));

        expect(scroll.callCount).to.be(9);
        for (let i = 0; i < scroll.callCount; i++) {
          expect(scroll.getCall(i).args[0]).to.eql({
            body: {
              scroll: '1m',
              scroll_id: 'scroll_id'
            }
          });
        }

        expect(results.length).to.be(100);
      }));

      afterEach(function () {
        search.restore();
        scroll.restore();
      });

    });

  });

});
