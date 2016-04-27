var expect = require('expect.js');
var ngMock = require('ngMock');
var _ = require('lodash');

var joinFilterHelper;
var kibiStateHelper;
var config;

describe('Kibi Components', function () {
  describe('Join Filter Helper', function () {

    var noDigestPromises = require('testUtils/noDigestPromises').activateForSuite();

    function init(kibiEnterpriseEnabled) {
      ngMock.module('kibana', function ($provide) {
        $provide.service('config', function () {
          var keys = {};
          return {
            get: function (key) { return keys[key]; },
            set: function (key, value) { keys[key] = value; }
          };
        });

        $provide.constant('kibiEnterpriseEnabled', kibiEnterpriseEnabled);
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardId', '');
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', function (Promise) {
          const dashboards = [
            {
              id: 'dashboard-nossid',
              title: 'dashboard-nossid'
            },
            {
              id: 'dashboard-a',
              title: 'dashboard-a',
              savedSearchId: 'savedsearch-a'
            },
            {
              id: 'dashboard-b',
              title: 'dashboard-b',
              savedSearchId: 'savedsearch-b'
            },
            {
              id: 'dashboard-c',
              title: 'dashboard-c',
              savedSearchId: 'savedsearch-c'
            },
            {
              id: 'dashboard-d',
              title: 'dashboard-d',
              savedSearchId: 'savedsearch-d'
            }
          ];
          return {
            find: function () {
              return Promise.resolve({ hits: dashboards });
            },
            get: function (id) {
              const savedDash = _.find(dashboards, 'id', id);
              if (!savedDash) {
                return Promise.reject(new Error('no dashboard ' + id));
              }
            }
          };
        });
      });

      ngMock.module('discover/saved_searches', function ($provide) {
        $provide.service('savedSearches', function (Promise) {
          const savedSearches = [
            {
              id: 'savedsearch-a',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-a',
                  filter: [],
                  query: {
                    query: {
                      query_string: {
                        term: 'aaa'
                      }
                    }
                  }
                })
              }
            },
            {
              id: 'savedsearch-b',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-b',
                  filter: [],
                  query: {
                    query: {
                      query_string: {
                        term: 'bbb'
                      }
                    }
                  }
                })
              }
            },
            {
              id: 'savedsearch-c',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-c',
                  filter: [],
                  query: {
                    query: {
                      query_string: {
                        term: 'ccc'
                      }
                    }
                  }
                })
              }
            },
            {
              id: 'savedsearch-d',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-d',
                  filter: [],
                  query: {
                    query: {
                      query_string: {
                        term: 'ddd'
                      }
                    }
                  }
                })
              }
            }
          ];
          return {
            find: function () {
              return Promise.resolve({ hits: savedSearches });
            },
            get: function (id) {
              return Promise.resolve({ searchSource: { _state: { index: { id: 'index-b' } } } });
              const savedSearch = _.find(savedSearches, 'id', id);
              if (!savedSearch) {
                return Promise.reject(new Error(`SavedSearch for [${id}] dashboard seems to not have an index id`));
              }
              const savedSearchMeta = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
              savedSearch.searchSource = {
                _state: {
                  index: {
                    id: savedSearchMeta.index
                  }
                }
              };
              return Promise.resolve(savedSearch);
            }
          };
        });
      });

      // have to provide a stub for indexPatterns
      // as joinFilterHelper.getJoinFilter will call indexPatterns.get(indexId)
      ngMock.module('kibana/index_patterns', function ($provide) {
        $provide.service('indexPatterns', function (Promise) {
          return {
            get: function (id) {
              switch (id) {
                case 'index-a':
                  return Promise.resolve({ id: 'index-a' });
                case 'index-b':
                  return Promise.resolve({ id: 'index-b' });
                case 'index-c':
                  return Promise.resolve({ id: 'index-c' });
                case 'index-d':
                  return Promise.resolve({ id: 'index-d' });
                default:
                  return Promise.reject(new Error('no indexPattern for: ' + id));
              }
            }
          };
        });
      });

      ngMock.inject(function (Private, _config_) {
        config = _config_;
        joinFilterHelper = Private(require('ui/kibi/helpers/join_filter_helper/join_filter_helper'));
        kibiStateHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
      });
    }

    describe('addAdvancedJoinSettingsToRelation', function () {
      beforeEach(() => init(true));

      it('should not try to get advanced relations if there is no relation defined', function () {
        config.set('kibi:relations', { relationsIndices: [] });
        joinFilterHelper.addAdvancedJoinSettingsToRelation();
      });

      it('should fail if the relation is not present', function () {
        config.set('kibi:relations', {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'investor',
                  path: 'id'
                },
                {
                  indexPatternId: 'investment',
                  path: 'investorid'
                }
              ],
              label: 'by',
              id: 'investment/investorid/investor/id'
            }
          ]
        });
        expect(joinFilterHelper.addAdvancedJoinSettingsToRelation).withArgs('company/id', 'article/companies')
          .to.throwException(/Could not find index relation corresponding to relation between/);
      });

      it('should get advanced relation for the given relation', function () {
        config.set('kibi:relations', {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'investor',
                  path: 'id',
                  termsEncoding: 'enc1',
                  orderBy: 'asc',
                  maxTermsPerShard: 1
                },
                {
                  indexPatternId: 'investment',
                  path: 'investorid',
                  termsEncoding: 'enc2',
                  orderBy: 'desc',
                  maxTermsPerShard: 2
                }
              ],
              label: 'by',
              id: 'investment/investorid/investor/id'
            }
          ]
        });

        const relation1 = [ {}, {} ];
        joinFilterHelper.addAdvancedJoinSettingsToRelation('investment/investorid', 'investor/id', relation1);
        expect(relation1[0].termsEncoding).to.be('enc1');
        expect(relation1[0].orderBy).to.be('asc');
        expect(relation1[0].maxTermsPerShard).to.be(1);
        expect(relation1[1].termsEncoding).to.be('enc2');
        expect(relation1[1].orderBy).to.be('desc');
        expect(relation1[1].maxTermsPerShard).to.be(2);

        const relation2 = [ {}, {} ];
        joinFilterHelper.addAdvancedJoinSettingsToRelation('investor/id', 'investment/investorid', relation2);
        expect(relation2[0].termsEncoding).to.be('enc2');
        expect(relation2[0].orderBy).to.be('desc');
        expect(relation2[0].maxTermsPerShard).to.be(2);
        expect(relation2[1].termsEncoding).to.be('enc1');
        expect(relation2[1].orderBy).to.be('asc');
        expect(relation2[1].maxTermsPerShard).to.be(1);
      });
    });

    describe('getJoinFilter', function () {
      beforeEach(() => init(false));

      it('should be disabled/enabled according to relationalPanel', function () {
        expect(joinFilterHelper.isRelationalPanelEnabled()).to.not.be.ok();
        config.set('kibi:relationalPanel', true);
        expect(joinFilterHelper.isRelationalPanelEnabled()).to.be.ok();
        config.set('kibi:relationalPanel', false);
        expect(joinFilterHelper.isRelationalPanelEnabled()).to.not.be.ok();
      });

      it('should be enabled if the plugin is installed', function () {
        expect(joinFilterHelper.isSirenJoinPluginInstalled()).to.be.ok();
      });

      it('should fail if focus dashboard is not passed', function (done) {
        joinFilterHelper.getJoinFilter().catch(function (err) {
          expect(err.message).to.be('Specify focusDashboardId');
          done();
        }).catch(done);
      });

      it('should fail if the focused dashboard is not in an enabled relation', function (done) {
        config.set('kibi:relationalPanel', true);
        config.set('kibi:relations', { relationsDashboards: [] });
        joinFilterHelper.getJoinFilter('does-not-exist').then(function (query) {
          expect(query).to.be(null);
          done();
        }).catch(done);
      });

      it('should fail if the focused dashboard cannot be retrieved', function (done) {
        var relDash = {
          dashboards: [ 'dashboard-a', 'does-not-exist' ],
          relation: 'index-a/id/index-b/id'
        };
        config.set('kibi:relationalPanel', true);
        kibiStateHelper.enableRelation(relDash);
        config.set('kibi:relations', { relationsDashboards: [ relDash ] });
        joinFilterHelper.getJoinFilter('does-not-exist').catch(function (err) {
          expect(err.message).to.be('Unable to retrieve dashboards: ["does-not-exist"].');
          done();
        }).catch(done);
      });

      it('should fail if the focused dashboard does not have a saved search', function (done) {
        var relDash = {
          dashboards: [ 'dashboard-a', 'dashboard-nossid' ],
          relation: 'index-a/id/index-b/id'
        };
        config.set('kibi:relationalPanel', true);
        config.set('kibi:relations', { relationsDashboards: [ relDash ] });
        kibiStateHelper.enableRelation(relDash);
        joinFilterHelper.getJoinFilter('dashboard-nossid').catch(function (err) {
          expect(err.message).to.be('The dashboard [dashboard-nossid] is expected to be associated with a saved search.');
          done();
        }).catch(done);
      });

      it('should fail if there is no kibi:relations set', function (done) {
        config.set('kibi:relations', {});
        joinFilterHelper.getJoinFilter('Boiled Dogs').catch(function (err) {
          expect(err.message).to.be('Could not get kibi:relations');
          done();
        }).catch(done);
      });

      it('should not build join_set filter if focused index does not have an enabled relation', function (done) {
        config.set('kibi:relationalPanel', true);
        config.set('kibi:relations', {
          relationsDashboards: [
            {
              dashboards: [ 'dashboard-a', 'dashboard-b' ],
              relation: 'index-a/id/index-b/id'
            },
            {
              dashboards: [ 'dashboard-b', 'dashboard-c' ],
              relation: 'index-b/id/index-c/id'
            }
          ]
        });
        joinFilterHelper.getJoinFilter('dashboard-c').then(function (query) {
          expect(query).to.be(null);
          done();
        }).catch(done);
      });

      it('1 should build the join filter', function (done) {
        config.set('kibi:relationalPanel', true);
        var relDash = {
          dashboards: [ 'dashboard-a', 'dashboard-b' ],
          relation: 'index-a/id/index-b/id'
        };
        config.set('kibi:relations', { relationsDashboards: [ relDash ] });
        kibiStateHelper.enableRelation(relDash);

        joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
          expect(joinFilter.join_set).to.be.ok();
          expect(joinFilter.meta).to.be.ok();
          expect(joinFilter.meta.alias).to.equal('dashboard-a <-> dashboard-b');
          expect(joinFilter.join_set.focus).to.be('index-a');
          expect(joinFilter.join_set.queries['index-a']).to.not.be.ok();
          done();
        }).catch(done);
      });

      it('2 should build the join filter with filters on dashboards', function (done) {
        // filters from the focused dashboard are not put in the filters of the join query
        kibiStateHelper.saveFiltersForDashboardId('dashbbord-a', [ { range: { gte: 20, lte: 40 } } ]);
        // filters from the Potatoes dashboard are not taken since its index is not connected to the focus
        kibiStateHelper.saveFiltersForDashboardId('dashboard-b', [ { exists: { field: 'aaa' } } ]);
        config.set('kibi:relationalPanel', true);
        const relDash = {
          dashboards: [ 'dashboard-a', 'dashboard-b' ],
          relation: 'index-a/id/index-b/id'
        };
        config.set('kibi:relations', { relationsDashboards: [ relDash ] });
        kibiStateHelper.enableRelation(relDash);

        joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
          expect(joinFilter.join_set).to.be.ok();
          expect(joinFilter.meta).to.be.ok();
          expect(joinFilter.meta.alias).to.equal('dashboard-a <-> dashboard-b');
          expect(joinFilter.join_set.focus).to.be('index-a');
          expect(joinFilter.join_set.queries['index-a']).to.not.be.ok();
          expect(joinFilter.join_set.queries['index-b']).to.have.length(2);
          expect(joinFilter.join_set.queries['index-b'][0]).to.eql({ query: { query: { query_string: { term: 'bbb' } } } });
          expect(joinFilter.join_set.queries['index-b'][1]).to.eql({ exists: { field: 'aaa' } });
          done();
        }).catch(done);
      });

      it('2 should build the join filter with queries on dashboards', function (done) {
        // queries from the focused dashboard are not put in the filters of the join query
        kibiStateHelper.saveQueryForDashboardId('dashboard-a', { query_string: { query: 'aaa' } });
        // queries from the Potatoes dashboard are not taken since its index is not connected to the focus
        kibiStateHelper.saveQueryForDashboardId('dashboard-b', { query_string: { query: 'ccc' } });
        config.set('kibi:relationalPanel', true);
        const relDash = {
          dashboards: [ 'dashboard-a', 'dashboard-b' ],
          relation: 'index-a/id/index-b/id'
        };
        config.set('kibi:relations', { relationsDashboards: [ relDash ] });
        kibiStateHelper.enableRelation(relDash);

        joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
          expect(joinFilter.join_set).to.be.ok();
          expect(joinFilter.meta).to.be.ok();
          expect(joinFilter.meta.alias).to.equal('dashboard-a <-> dashboard-b');
          expect(joinFilter.join_set.focus).to.be('index-a');
          expect(joinFilter.join_set.queries['index-a']).to.not.be.ok();
          expect(joinFilter.join_set.queries['index-b']).to.be.ok();
          expect(joinFilter.join_set.queries['index-b'][0]).to.eql({
            query: {
              query_string: { query: 'ccc' }
            }
          });
          done();
        }).catch(done);
      });
    });

    describe('updateJoinSetFilter', function () {
      var urlHelper;
      var sinon = require('auto-release-sinon');

      beforeEach(() => init(false));

      beforeEach(function () {
        ngMock.inject(function (Private) {
          urlHelper   = Private(require('ui/kibi/helpers/url_helper'));
        });
        sinon.spy(urlHelper, 'removeJoinFilter');
        sinon.spy(urlHelper, 'addFilter');
      });

      it('should remove the join filter 1', function (done) {
        joinFilterHelper.updateJoinSetFilter().then(function () {
          expect(urlHelper.removeJoinFilter.called).to.be.ok();
          done();
        }).catch(done);
      });

      it('should remove the join filter 2', function (done) {
        config.set('kibi:relations', {
          relationsDashboards: [{
            dashboards: [ 'dashboard-a', 'dashboard-b' ],
            relation: 'a/id/b/id'
          }]
        });
        sinon.stub(urlHelper, 'getCurrentDashboardId').returns('aaa');
        joinFilterHelper.updateJoinSetFilter().then(function () {
          expect(urlHelper.removeJoinFilter.called).to.be.ok();
          done();
        }).catch(done);
      });

      it('should add the join filter', function (done) {
        kibiStateHelper.saveFiltersForDashboardId('dashboard-a', [ { range: { gte: 20, lte: 40 } } ]);
        kibiStateHelper.saveFiltersForDashboardId('dashboard-b', [ { term: { aaa: 'bbb' } } ]);
        config.set('kibi:relationalPanel', true);
        const relDash = {
          dashboards: [ 'dashboard-a', 'dashboard-b' ],
          relation: 'index-a/id/index-b/id'
        };
        config.set('kibi:relations', { relationsDashboards: [ relDash ] });
        kibiStateHelper.enableRelation(relDash);
        sinon.stub(urlHelper, 'getCurrentDashboardId').returns('dashboard-b');

        joinFilterHelper.updateJoinSetFilter().then(function () {
          expect(urlHelper.addFilter.called).to.be.ok();
          done();
        }).catch(done);
      });

      it('should remove the join filter from all dashboards that do not have an enabled relation adjacent', function (done) {
        kibiStateHelper.saveFiltersForDashboardId('dashboard-a', [ { term: {} }, { join_set: {} } ]);
        kibiStateHelper.saveFiltersForDashboardId('dashboard-b', [ { term: {} }, { join_set: {} } ]);
        kibiStateHelper.saveFiltersForDashboardId('dashboard-c', [ { term: {} }, { join_set: {} } ]);
        kibiStateHelper.saveFiltersForDashboardId('dashboard-d', [ { term: {} }, { join_set: {} } ]);
        config.set('kibi:relationalPanel', true);
        const relDash1 = {
          dashboards: [ 'dashboard-a', 'dashboard-b' ],
          relation: 'a/id/b/id'
        };
        const relDash2 = {
          dashboards: [ 'dashboard-b', 'dashboard-c' ],
          relation: 'b/id/c/id'
        };
        const relDash3 = {
          dashboards: [ 'dashboard-c', 'dashboard-d' ],
          relation: 'c/id/d/id'
        };
        config.set('kibi:relations', { relationsDashboards: [ relDash1, relDash2, relDash3 ] });
        kibiStateHelper.enableRelation(relDash1);
        kibiStateHelper.disableRelation(relDash2);
        kibiStateHelper.disableRelation(relDash3);

        sinon.stub(urlHelper, 'getCurrentDashboardId').returns('dashboard-a');
        joinFilterHelper.updateJoinSetFilter([ 'dashboard-c', 'dashboard-d' ]).then(function () {
          var filtersa = kibiStateHelper.getFiltersForDashboardId('dashboard-a');
          expect(filtersa).to.have.length(2);
          expect(filtersa[0].term).to.be.ok();
          expect(filtersa[1].join_set).to.be.ok();

          var filtersb = kibiStateHelper.getFiltersForDashboardId('dashboard-b');
          expect(filtersb).to.have.length(2);
          expect(filtersb[0].term).to.be.ok();
          expect(filtersb[1].join_set).to.be.ok();

          var filtersc = kibiStateHelper.getFiltersForDashboardId('dashboard-c');
          expect(filtersc).to.have.length(1);
          expect(filtersc[0].term).to.be.ok();

          var filtersd = kibiStateHelper.getFiltersForDashboardId('dashboard-d');
          expect(filtersd).to.have.length(1);
          expect(filtersd[0].term).to.be.ok();
          done();
        }).catch(done);
      });

      it('should add the join filter to all dashboards that have an enabled relation adjacent', function (done) {
        kibiStateHelper.saveFiltersForDashboardId('dashboard-a', [ { term: {} }, { join_set: {} } ]);
        kibiStateHelper.saveFiltersForDashboardId('dashboard-b', [ { term: {} }, { join_set: {} } ]);
        kibiStateHelper.saveFiltersForDashboardId('dashboard-c', [ { term: {} } ]);
        kibiStateHelper.saveFiltersForDashboardId('dashboard-d', [ { term: {} } ]);
        config.set('kibi:relationalPanel', true);
        const relDash1 = {
          dashboards: [ 'dashboard-a', 'dashboard-b' ],
          relation: 'a/id/b/id'
        };
        const relDash2 = {
          dashboards: [ 'dashboard-b', 'dashboard-c' ],
          relation: 'b/id/c/id'
        };
        const relDash3 = {
          dashboards: [ 'dashboard-c', 'dashboard-d' ],
          relation: 'c/id/d/id'
        };
        config.set('kibi:relations', { relationsDashboards: [ relDash1, relDash2, relDash3 ] });
        kibiStateHelper.enableRelation(relDash1);
        kibiStateHelper.disableRelation(relDash2);
        kibiStateHelper.enableRelation(relDash3);

        sinon.stub(urlHelper, 'getCurrentDashboardId').returns('dashboard-a');
        joinFilterHelper.updateJoinSetFilter([ 'dashboard-c', 'dashboard-d' ]).then(function () {
          var filtersa = kibiStateHelper.getFiltersForDashboardId('dashboard-a');
          expect(filtersa).to.have.length(2);
          expect(filtersa[0].term).to.be.ok();
          expect(filtersa[1].join_set).to.be.ok();

          var filtersb = kibiStateHelper.getFiltersForDashboardId('dashboard-b');
          expect(filtersb).to.have.length(2);
          expect(filtersb[0].term).to.be.ok();
          expect(filtersb[1].join_set).to.be.ok();

          var filtersc = kibiStateHelper.getFiltersForDashboardId('dashboard-c');
          expect(filtersc).to.have.length(2);
          expect(filtersc[0].term).to.be.ok();
          expect(filtersc[1].join_set).to.be.ok();

          var filtersd = kibiStateHelper.getFiltersForDashboardId('dashboard-d');
          expect(filtersd).to.have.length(2);
          expect(filtersd[0].term).to.be.ok();
          expect(filtersd[1].join_set).to.be.ok();
          done();
        }).catch(done);
      });
    });
  });
});
