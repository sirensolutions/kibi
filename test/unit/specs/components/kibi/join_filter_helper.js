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

      describe('util methods methods', function () {

        it('findIndexAssociatedToDashboard', function () {
          var map = {
            indexa: ['A', 'B'],
            indexc: ['C']
          };

          expect(joinFilterHelper.findIndexAssociatedToDashboard(map, 'A')).to.equal('indexa');
          expect(joinFilterHelper.findIndexAssociatedToDashboard(map, 'B')).to.equal('indexa');
          expect(joinFilterHelper.findIndexAssociatedToDashboard(map, 'C')).to.equal('indexc');
        });

      });

      describe('getJoinFilter', function () {
        it('should be disabled/enabled according to relationalPanelConfig', function () {
          expect(joinFilterHelper.isRelationalPanelEnabled()).to.not.be.ok();
          config.set('kibi:relationalPanelConfig', { enabled: true });
          expect(joinFilterHelper.isRelationalPanelEnabled()).to.be.ok();
          config.set('kibi:relationalPanelConfig', { enabled: false });
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
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            relations: []
          });
          joinFilterHelper.getJoinFilter('does-not-exist').catch(function (err) {
            expect(err.message).to.be('no dashboard does-not-exist');
            done();
          });
        });

        it('should fail if the focused dashboard does not have a saved search', function (done) {
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            relations: []
          });
          joinFilterHelper.getJoinFilter('dashboard-nossid').catch(function (err) {
            expect(err.message).to.be('The focus dashboard "dashboard-nossid" does not have a saveSearchId');
            done();
          });
        });

        it('should fail if there is no kibi:relationalPanelConfig set', function (done) {
          joinFilterHelper.getJoinFilter('Boiled Dogs').catch(function (err) {
            expect(err.message).to.be('Could not get kibi:relationalPanelConfig');
            done();
          });
        });

        it('should fail if there is no kibi:relationalPanelConfig.relations set', function (done) {
          config.set('kibi:relationalPanelConfig', { enabled: true });
          joinFilterHelper.getJoinFilter('dashboard-a').catch(function (err) {
            expect(err.message).to.be('Could not get kibi:relationalPanelConfig.relations');
            done();
          });
        });

        it('should fail if the saved search of the focused dashboard does not have an index id', function (done) {
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            relations: [{
              enabled: true,
              from: 'dashboard-a',
              fromPath: 'id',
              to: 'dashboard-noindexid',
              toPath: 'id'
            }]
          });
          joinFilterHelper.getJoinFilter('dashboard-noindexid').catch(function (err) {
            expect(err.message).to.be('SavedSearch for [dashboard-noindexid] dashboard seems to not have an index id');
            done();
          });
        });


        it('1 should build the join filter', function (done) {
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            relations: [{
              enabled: true,
              from: 'dashboard-a',
              fromPath: 'id',
              to: 'dashboard-b',
              toPath: 'id'
            }]
          });
          joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
            expect(joinFilter.join_set).to.be.ok();
            expect(joinFilter.meta).to.be.ok();
            expect(joinFilter.meta.value).to.equal('index-a <-> index-b');
            expect(joinFilter.join_set.focus).to.be('index-a');
            expect(joinFilter.join_set.queries['index-a']).to.not.be.ok();
            done();
          });
        });

        it('2 should build the join filter with filters on dashboards', function (done) {
          // filters from the focused dashboard are not put in the filters of the join query
          kibiStateHelper.saveFiltersForDashboardId('dashbbord-a', [ { range: { gte: 20, lte: 40 } } ]);
          // filters from the Potatoes dashboard are not taken since its index is not connected to the focus
          kibiStateHelper.saveFiltersForDashboardId('dashboard-b', [ { exists: { field: 'aaa' } } ]);
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            relations: [{
              enabled: true,
              from: 'dashboard-a',
              fromPath: 'id',
              to: 'dashboard-b',
              toPath: 'id'
            }]
          });
          joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
            expect(joinFilter.join_set).to.be.ok();
            expect(joinFilter.meta).to.be.ok();
            expect(joinFilter.meta.value).to.equal('index-a <-> index-b');
            expect(joinFilter.join_set.focus).to.be('index-a');
            expect(joinFilter.join_set.queries['index-a']).to.not.be.ok();
            expect(joinFilter.join_set.queries['index-b']).to.be.ok();
            expect(joinFilter.join_set.queries['index-b'][0]).to.eql({
              exists: { field: 'aaa' }
            });
            done();
          });
        });

        it('2 should build the join filter with queries on dashboards', function (done) {
          // queries from the focused dashboard are not put in the filters of the join query
          kibiStateHelper.saveQueryForDashboardId('dashboard-a', { query_string: { query: 'aaa' } });
          // queries from the Potatoes dashboard are not taken since its index is not connected to the focus
          kibiStateHelper.saveQueryForDashboardId('dashboard-b', { query_string: { query: 'ccc' } });
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            relations: [{
              enabled: true,
              from: 'dashboard-a',
              fromPath: 'id',
              to: 'dashboard-b',
              toPath: 'id'
            }]
          });
          joinFilterHelper.getJoinFilter('dashboard-a').then(function (joinFilter) {
            expect(joinFilter.join_set).to.be.ok();
            expect(joinFilter.meta).to.be.ok();
            expect(joinFilter.meta.value).to.equal('index-a <-> index-b');
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

      describe('updateJoinFilter', function () {
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
          joinFilterHelper.updateJoinFilter().then(function () {
            expect(urlHelper.removeJoinFilter.called).to.be.ok();
            done();
          });
        });

        it('should remove the join filter 2', function (done) {
          sinon.stub(urlHelper, 'getCurrentDashboardId').returns('aaa');
          joinFilterHelper.updateJoinFilter().then(function () {
            expect(urlHelper.removeJoinFilter.called).to.be.ok();
            done();
          });
        });

        it('should add the join filter', function (done) {
          kibiStateHelper.saveFiltersForDashboardId('dashboard-a', [ { range: { gte: 20, lte: 40 } } ]);
          kibiStateHelper.saveFiltersForDashboardId('dashboard-b', [ { term: { aaa: 'bbb' } } ]);
          config.set('kibi:relationalPanelConfig', {
            enabled: true,
            relations: [{
              enabled: true,
              from: 'dashboard-a',
              fromPath: 'id',
              to: 'dashboard-b',
              toPath: 'id'
            }]
          });
          sinon.stub(urlHelper, 'getCurrentDashboardId').returns('dashboard-b');
          joinFilterHelper.updateJoinFilter().then(function () {
            expect(urlHelper.addFilter.called).to.be.ok();
            done();
          }).catch(function (err) {
            done(err);
          });
        });
      });
    });
  });
});
