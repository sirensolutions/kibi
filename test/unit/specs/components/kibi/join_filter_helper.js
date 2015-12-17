define(function (require) {
  var joinFilterHelper;
  var kibiStateHelper;
  var config;

  describe('Kibi Components', function () {
    describe('Join Filter Helper', function () {

      require('test_utils/no_digest_promises').activateForSuite();

      beforeEach(function () {
        module('kibana');

        module('kibana', function ($provide) {
          $provide.service('config', function () {
            var keys = {};
            return {
              get: function (key) { return keys[key]; },
              set: function (key, value) { keys[key] = value; }
            };
          });
          $provide.constant('configFile', {
            elasticsearch_plugins: [ 'FilterJoinPlugin' ]
          });
        });

        module('app/dashboard', function ($provide) {
          $provide.service('savedDashboards', function (Promise) {
            return {
              find: function () {
                return Promise.resolve({
                  hits: [
                    {
                      id: 'dashboard-nossid'
                    },
                    {
                      id: 'dashboard-noindexid',
                      savedSearchId: 'savedsearch-noindexid'
                    },
                    {
                      id: 'dashboard-a',
                      savedSearchId: 'savedsearch-a'
                    },
                    {
                      id: 'dashboard-b',
                      savedSearchId: 'savedsearch-b'
                    },
                    {
                      id: 'dashboard-c',
                      savedSearchId: 'savedsearch-c'
                    },
                    {
                      id: 'dashboard-d',
                      savedSearchId: 'savedsearch-d'
                    }
                  ]
                });
              },
              get: function (id) {
                switch (id) {
                  case 'dashboard-nossid':
                    return Promise.resolve({ id: 'dashboard-nossid' });
                  case 'dashboard-noindexid':
                    return Promise.resolve({ id: 'dashboard-noindexid', savedSearchId: 'savedsearch-noindexid' });
                  case 'dashboard-a':
                    return Promise.resolve({ id: 'dashboard-a', savedSearchId: 'savedsearch-a' });
                  case 'dashboard-b':
                    return Promise.resolve({ id: 'dashboard-b', savedSearchId: 'savedsearch-b' });
                  case 'dashboard-c':
                    return Promise.resolve({ id: 'dashboard-c', savedSearchId: 'savedsearch-c' });
                  case 'dashboard-d':
                    return Promise.resolve({ id: 'dashboard-d', savedSearchId: 'savedsearch-d' });
                  default:
                    return Promise.reject(new Error('no dashboard ' + id));
                }
              }
            };
          });
        });

        module('discover/saved_searches', function ($provide) {
          $provide.service('savedSearches', function (Promise) {
            return {
              get: function (id) {
                switch (id) {
                  case 'savedsearch-a':
                    return Promise.resolve({ searchSource: { _state: { index: { id: 'index-a' } } } });
                  case 'savedsearch-b':
                    return Promise.resolve({ searchSource: { _state: { index: { id: 'index-b' } } } });
                  case 'savedsearch-c':
                    return Promise.resolve({ searchSource: { _state: { index: { id: 'index-c' } } } });
                  case 'savedsearch-d':
                    return Promise.resolve({ searchSource: { _state: { index: { id: 'index-d' } } } });
                  case 'savedsearch-noindexid':
                    return Promise.resolve({ searchSource: { _state: { index: { } } } });
                  default:
                    return Promise.reject(new Error('no savedSearch ' + id));
                }
              }
            };
          });
        });


        // have to provide a stub for indexPatterns
        // as joinFilterHelper.getJoinFilter will call indexPatterns.get(indexId)
        module('kibana/index_patterns', function ($provide) {
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



        inject(function (Private, _config_) {
          config = _config_;
          joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));
          kibiStateHelper = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
        });
      });

      describe('getJoinFilter', function () {
        it('should be disabled/enabled according to relationalPanel', function () {
          expect(joinFilterHelper.isRelationalPanelEnabled()).to.not.be.ok();
          config.set('kibi:relationalPanel', true);
          expect(joinFilterHelper.isRelationalPanelEnabled()).to.be.ok();
          config.set('kibi:relationalPanel', false);
          expect(joinFilterHelper.isRelationalPanelEnabled()).to.not.be.ok();
        });

        it('should be enabled if the plugin is installed', function () {
          expect(joinFilterHelper.isFilterJoinPluginInstalled()).to.be.ok();
        });

        it('should fail if focus dashboard is not passed', function (done) {
          joinFilterHelper.getJoinFilter().catch(function (err) {
            expect(err.message).to.be('Specify focusDashboardId');
            done();
          });
        });

        it('should fail if the focused dashboard cannot be retrieved', function (done) {
          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', { relationsDashboards: [] });
          joinFilterHelper.getJoinFilter('does-not-exist').catch(function (err) {
            expect(err.message).to.be('no dashboard does-not-exist');
            done();
          });
        });

        it('should fail if the focused dashboard does not have a saved search', function (done) {
          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', { relationsDashboards: [] });
          joinFilterHelper.getJoinFilter('dashboard-nossid').catch(function (err) {
            expect(err.message).to.be('The focus dashboard "dashboard-nossid" does not have a saveSearchId');
            done();
          });
        });

        it('should fail if there is no kibi:relations set', function (done) {
          config.set('kibi:relations', {});
          joinFilterHelper.getJoinFilter('Boiled Dogs').catch(function (err) {
            expect(err.message).to.be('Could not get kibi:relations');
            done();
          });
        });

        it('should fail if the saved search of the focused dashboard does not have an index id', function (done) {
          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', {
            relationsDashboards: [{
              dashboards: [ 'dashboard-a', 'dashboard-noindexid' ],
              relation: 'a/id/noindexid/id'
            }]
          });
          joinFilterHelper.getJoinFilter('dashboard-noindexid').catch(function (err) {
            expect(err.message).to.be('SavedSearch for [dashboard-noindexid] dashboard seems to not have an index id');
            done();
          });
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
          joinFilterHelper.getJoinFilter('dashboard-c').catch(function (err) {
            expect(err.message).to.be('The join filter has no enabled relation for the focused dashboard : dashboard-c');
            done();
          });
        });

        it('1 should build the join filter', function (done) {
          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', {
            relationsDashboards: [{
              dashboards: [ 'dashboard-a', 'dashboard-b' ],
              relation: 'index-a/id/index-b/id'
            }],
          });
          kibiStateHelper.enableRelation('index-a/id/index-b/id');

          joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
            expect(joinFilter.join_set).to.be.ok();
            expect(joinFilter.meta).to.be.ok();
            expect(joinFilter.meta.value).to.equal('dashboard-a <-> dashboard-b');
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
          config.set('kibi:relations', {
            relationsDashboards: [{
              dashboards: [ 'dashboard-a', 'dashboard-b' ],
              relation: 'index-a/id/index-b/id'
            }]
          });
          kibiStateHelper.enableRelation('index-a/id/index-b/id');

          joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
            expect(joinFilter.join_set).to.be.ok();
            expect(joinFilter.meta).to.be.ok();
            expect(joinFilter.meta.value).to.equal('dashboard-a <-> dashboard-b');
            expect(joinFilter.join_set.focus).to.be('index-a');
            expect(joinFilter.join_set.queries['index-a']).to.not.be.ok();
            expect(joinFilter.join_set.queries['index-b']).to.be.ok();
            expect(joinFilter.join_set.queries['index-b'][0]).to.eql({
              exists: { field: 'aaa' }
            });
            done();
          }).catch(done);
        });

        it('2 should build the join filter with queries on dashboards', function (done) {
          // queries from the focused dashboard are not put in the filters of the join query
          kibiStateHelper.saveQueryForDashboardId('dashboard-a', { query_string: { query: 'aaa' } });
          // queries from the Potatoes dashboard are not taken since its index is not connected to the focus
          kibiStateHelper.saveQueryForDashboardId('dashboard-b', { query_string: { query: 'ccc' } });
          config.set('kibi:relationalPanel', true);
          config.set('kibi:relations', {
            relationsDashboards: [{
              dashboards: [ 'dashboard-a', 'dashboard-b' ],
              relation: 'index-a/id/index-b/id'
            }]
          });
          kibiStateHelper.enableRelation('index-a/id/index-b/id');

          joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
            expect(joinFilter.join_set).to.be.ok();
            expect(joinFilter.meta).to.be.ok();
            expect(joinFilter.meta.value).to.equal('dashboard-a <-> dashboard-b');
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
        var sinon = require('test_utils/auto_release_sinon');

        beforeEach(function () {
          inject(function (Private) {
            urlHelper   = Private(require('components/kibi/url_helper/url_helper'));
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
          config.set('kibi:relations', {
            relationsDashboards: [{
              dashboards: [ 'dashboard-a', 'dashboard-b' ],
              relation: 'a/id/b/id'
            }]
          });
          kibiStateHelper.enableRelation('a/id/b/id');
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
          config.set('kibi:relations', {
            relationsDashboards: [
              {
                dashboards: [ 'dashboard-a', 'dashboard-b' ],
                relation: 'a/id/b/id'
              },
              {
                dashboards: [ 'dashboard-b', 'dashboard-c' ],
                relation: 'b/id/c/id'
              },
              {
                dashboards: [ 'dashboard-c', 'dashboard-d' ],
                relation: 'c/id/d/id'
              }
            ]
          });
          kibiStateHelper.enableRelation('a/id/b/id');
          kibiStateHelper.disableRelation('b/id/c/id');
          kibiStateHelper.disableRelation('c/id/d/id');

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
          config.set('kibi:relations', {
            relationsDashboards: [
              {
                dashboards: [ 'dashboard-a', 'dashboard-b' ],
                relation: 'a/id/b/id'
              },
              {
                dashboards: [ 'dashboard-b', 'dashboard-c' ],
                relation: 'b/id/c/id'
              },
              {
                dashboards: [ 'dashboard-c', 'dashboard-d' ],
                relation: 'c/id/d/id'
              }
            ]
          });
          kibiStateHelper.enableRelation('a/id/b/id');
          kibiStateHelper.disableRelation('b/id/c/id');
          kibiStateHelper.enableRelation('c/id/d/id');

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
});
