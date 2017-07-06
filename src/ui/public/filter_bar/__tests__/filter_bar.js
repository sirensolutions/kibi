let angular = require('angular');
let _ = require('lodash');
let $ = require('jquery');
let ngMock = require('ngMock');
let expect = require('expect.js');
let sinon = require('sinon');

require('ui/filter_bar');
let mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
let MockState = require('fixtures/mock_state');

describe('Filter Bar Directive', function () {
  let $rootScope;
  let $compile;
  let $timeout;
  let Promise;
  let appState;
  let queryFilter;
  let mapFilter;
  let $el;
  let $scope;
  // require('testUtils/noDigestPromises').activateForSuite();

  beforeEach(ngMock.module('kibana/global_state', function ($provide) {
    $provide.service('getAppState', _.constant(_.constant(
      appState = new MockState({ filters: [] })
    )));
  }));

  beforeEach(function () {
    // load the application
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('elasticsearchPlugins', ['siren-join']);

      $provide.service('kibiState', function () {
        return new MockState({
          _getCurrentDashboardId: _.noop,
          isSelectedEntityDisabled: _.constant(false),
          getEntityURI: _.noop
        });
      });

      $provide.service('$route', function () {
        return {
          reload: _.noop
        };
      });
    });

    ngMock.module('queries_editor/services/saved_queries', function ($provide) {
      $provide.service('savedQueries', (Promise, Private) => mockSavedObjects(Promise, Private)('savedQueries'));
    });

    ngMock.module('kibana/courier', function ($provide) {
      $provide.service('courier', require('fixtures/mock_courier'));
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearch'));
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboard'));
    });

    ngMock.inject(function (Private, $injector, _$rootScope_, _$compile_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      Promise = $injector.get('Promise');
      mapFilter = Private(require('ui/filter_bar/lib/mapFilter'));

      let queryFilter = Private(require('ui/filter_bar/query_filter'));
      queryFilter.getFilters = function () {
        return appState.filters;
      };
    });
  });

  function init(filters) {
    return function (done) {
      Promise.map(filters, mapFilter).then(function (filters) {
        appState.filters = filters;
        $el = $compile('<filter-bar></filter-bar>')($rootScope);
        $scope = $el.isolateScope();
      });

      let off = $rootScope.$on('filterbar:updated', function () {
        off();
        // force a nextTick so it continues *after* the $digest loop completes
        setTimeout(done, 0);
      });

      // kick off the digest loop
      $rootScope.$digest();
    };
  }

  describe('join sequence alias', function () {

    beforeEach(() => init([
      {
        meta: {
          index: 'logstash-*',
          alias: '123 articles',
          alias_tmpl: '$COUNT articles',
          buttons: []
        },
        join_sequence: {
          reverse: _.noop
        }
      },
      {
        meta: {
          index: 'logstash-*'
        },
        exists: {
          field: '@timestamp'
        }
      }
    ])());

    it('should leave the alias as is', function () {
      expect($scope.state.filters[0].meta.alias).to.be('123 articles');
    });

    it('should replace the count with dots if a filter is added', function () {
      expect($scope.state.filters[0].meta.alias).to.be('123 articles');
      $scope.state.filters.push({ meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } });
      $scope.$digest();
      expect($scope.state.filters[0].meta.alias).to.be('... articles');
    });

    it('should replace the count with dots if a filter is removed', function () {
      expect($scope.state.filters[0].meta.alias).to.be('123 articles');
      $scope.state.filters.pop();
      $scope.$digest();
      expect($scope.state.filters[0].meta.alias).to.be('... articles');
    });
  });

  describe('Element rendering', function () {
    beforeEach(() => init([
      { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
      { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
      { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
      { meta: { index: 'logstash-*' }, missing: { field: 'host' }, disabled: true },
      { meta: { index: 'logstash-*', alias: 'foo' }, query: { match: { '_type': { query: 'nginx' } } } },
    ])());

    it('should render all the filters in state', function () {
      let filters = $el.find('.filter');
      expect(filters).to.have.length(5);
      expect($(filters[0]).find('span')[0].innerHTML).to.equal('_type:');
      expect($(filters[0]).find('span')[1].innerHTML).to.equal('"apache"');
      expect($(filters[1]).find('span')[0].innerHTML).to.equal('_type:');
      expect($(filters[1]).find('span')[1].innerHTML).to.equal('"nginx"');
      expect($(filters[2]).find('span')[0].innerHTML).to.equal('exists:');
      expect($(filters[2]).find('span')[1].innerHTML).to.equal('"@timestamp"');
      expect($(filters[3]).find('span')[0].innerHTML).to.equal('missing:');
      expect($(filters[3]).find('span')[1].innerHTML).to.equal('"host"');
    });

    it('should be able to set an alias', function () {
      let filter = $el.find('.filter')[4];
      expect($(filter).find('span')[0].innerHTML).to.equal('foo');
    });

    describe('editing filters', function () {
      beforeEach(function () {
        $scope.startEditingFilter(appState.filters[3]);
        $scope.$digest();
      });

      it('should be able to edit a filter', function () {
        expect($el.find('.filter-edit-container').length).to.be(1);
      });

      it('should be able to stop editing a filter', function () {
        $scope.stopEditingFilter();
        $scope.$digest();
        expect($el.find('.filter-edit-container').length).to.be(0);
      });

      it('should merge changes after clicking done', function () {
        sinon.spy($scope, 'updateFilter');

        $scope.editDone();
        expect($scope.updateFilter.called).to.be(true);
      });
    });
  });
});
