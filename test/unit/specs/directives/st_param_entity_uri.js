define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var angular = require('angular');
  var _ = require('lodash');
  var $httpBackend;
  var Notifier;

  require('directives/st_param_entity_uri');

  var $rootScope;
  var $scope;

  var init = function (entityUriHolder, mappings) {
    // Load the application
    module('kibana');

    module('kibana/courier', function ($provide) {
      $provide.service('courier', function (Promise) {
        return {
          indexPatterns: {
            getIds: function () {
              return Promise.resolve(_.pluck(mappings, 'index'));
            }
          }
        };
      });
    });

    module('queries_editor/services/saved_queries', function ($provide) {
      $provide.service('savedQueries', function (Promise) {
        return {
          get: function (id) {
            return Promise.reject();
          }
        };
      });
    });

    module('kibana', function ($provide) {
      $provide.service('savedDatasources', function () {});
    });

    module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', function () {});
    });

    module('kibana/index_patterns', function ($provide) {
      $provide.service('indexPatterns', function (Promise, Private) {
        var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        return {
          get: function (id) {
            return Promise.resolve(indexPattern);
          }
        };
      });
    });

    // Create the scope
    inject(function ($injector, Private, _$rootScope_, $compile) {
      var entityParamUri = '<st-param-entity-uri entity-uri-holder="holder"></st-param-entity-uri>';
      var ids = { hits: { hits: [] } };

      Notifier = $injector.get('Notifier');
      sinon.stub(Notifier.prototype, 'warning');
      $httpBackend = $injector.get('$httpBackend');

      _.each(mappings, function (m) {
        // data for getTypes of st_select_helper
        $httpBackend.whenGET('elasticsearch/' + m.index + '/_mappings').respond(200);
        // data for getDocumentIds of st_select_helper
        $httpBackend.whenGET('elasticsearch/' + m.index + '/' + m.type + '/_search?size=10').respond(200, ids);
      });

      var parts = entityUriHolder && entityUriHolder.entityURI && entityUriHolder.entityURI.split('/');
      if (parts.length >= 2 && parts[0].indexOf('*') !== -1) {
        var indexPatterns = _.filter(mappings, 'pattern', parts[0]);
        var mappingsObject = _.zipObject(
          _.pluck(indexPatterns, 'index'),
          _.map(indexPatterns, function (ip) {
            var val = { mappings: {} };
            val.mappings[ip.type] = {};
            return val;
          })
        );
        // data for getTypes of st_select_helper
        $httpBackend.whenGET('elasticsearch/' + parts[0] + '/_mappings').respond(200, mappingsObject);
        // data for getDocumentIds of st_select_helper
        $httpBackend.whenGET('elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?size=10').respond(200, ids);
      }

      $rootScope = _$rootScope_;
      $rootScope.holder = entityUriHolder;
      var $elem = angular.element(entityParamUri);
      $compile($elem)($rootScope);
      $elem.scope().$digest();
      $scope = $elem.isolateScope();
    });
  };

  describe('Kibi Directives', function () {
    describe('st-param-entity-uri directive', function () {

      afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      });

      it('should set the scope object correctly', function () {
        var holder = {
          entityURI: 'a/b/c/area'
        };
        var mappings = [
          {
            index: 'a',
            type: 'b'
          }
        ];

        init(holder, mappings);
        $httpBackend.flush();

        expect(Notifier.prototype.warning.called).to.be(false);
        expect($scope.c).to.be.ok();
        expect($scope.c.index).to.be('a');
        expect($scope.c.type).to.be('b');
        expect($scope.c.id).to.be('c');
        expect($scope.c.column).to.be('area');
      });

      it('should select the index for the specified type', function () {
        var holder = {
          entityURI: 'a*/b2/c/area'
        };
        var mappings = [
          {
            pattern: 'a*',
            index: 'a1',
            type: 'b1'
          },
          {
            pattern: 'a*',
            index: 'a2',
            type: 'b2'
          }
        ];

        init(holder, mappings);
        $httpBackend.flush();

        expect(Notifier.prototype.warning.called).to.be(false);
        expect($scope.c).to.be.ok();
        expect($scope.c.index).to.be('a2');
        expect($scope.c.type).to.be('b2');
        expect($scope.c.id).to.be('c');
        expect($scope.c.column).to.be('area');
      });

      it('should return an error if index pattern is ambiguous', function () {
        var holder = {
          entityURI: 'a*/b2/c/area'
        };
        var mappings = [
          {
            pattern: 'a*',
            index: 'a1',
            type: 'b1'
          },
          {
            pattern: 'a*',
            index: 'a2',
            type: 'b1'
          }
        ];

        init(holder, mappings);
        $httpBackend.flush();

        expect(Notifier.prototype.warning.called).to.be(true);
      });
    });
  });
});
