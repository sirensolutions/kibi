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


    module('kibana/courier', function ($provide) {
      $provide.service('courier', function (Promise) {
        return {
          indexPatterns: {
            getIds: function () {
              return Promise.resolve(_.map(mappings, function (m) {
                return m.pattern;
              }));
            }
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
      sinon.stub(Notifier.prototype, 'error');
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

        // responses to wildcard id queries
        if (parts[0] === 'm*') {
          // more than one result
          $httpBackend.whenGET('elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?q=_id:' + parts[2]).respond(200, {
            hits: {
              total: 2,
              hits: [
                {
                  _index: mappings[0].index,
                  _type: mappings[0].type,
                  _id: parts[2]
                },
                {
                  _index: mappings[0].index,
                  _type: mappings[0].type,
                  _id: parts[2]
                }
              ]
            }
          });
        } else if (parts[0] === 'n*') {
          $httpBackend.whenGET('elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?q=_id:' + parts[2]).respond(200, {
            hits: {
              total: 0,
              hits: []
            }
          });
        } else if (parts[0] === 'e*') {
          $httpBackend.whenGET('elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?q=_id:' + parts[2]).respond(500);
        } else {
          // one result
          $httpBackend.whenGET('elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?q=_id:' + parts[2]).respond(200, {
            hits: {
              total: 1,
              hits: [
                {
                  _index: mappings[0].index,
                  _type: mappings[0].type,
                  _id: parts[2]
                }
              ]
            }
          });
        }
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
            pattern: 'a',
            index: 'a',
            type: 'b'
          }
        ];

        init(holder, mappings);
        $httpBackend.flush();

        expect(Notifier.prototype.warning.called).to.be(false);
        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be('a');
        expect($scope.c.index).to.be('a');
        expect($scope.c.type).to.be('b');
        expect($scope.c.id).to.be('c');
        expect($scope.c.column).to.be('area');
      });

      it('should handle a wildcard index pattern', function () {
        var holder = {
          entityURI: 'a*/b1/c/area'
        };
        var mappings = [
          {
            pattern: 'a*',
            index: 'a-1',
            type: 'b1'
          },
          {
            pattern: 'a*',
            index: 'a-2',
            type: 'b2'
          }
        ];

        init(holder, mappings);
        $httpBackend.flush();

        expect(Notifier.prototype.warning.called).to.be(false);
        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be('a*');
        expect($scope.c.index).to.be('a-1');
        expect($scope.c.type).to.be('b1');
        expect($scope.c.id).to.be('c');
        expect($scope.c.column).to.be('area');
      });

      it('should unset the type and set the index when the index pattern is changed', function () {
        var holder = {
          entityURI: 'a*/b1/c/area'
        };
        var mappings = [
          {
            pattern: 'a*',
            index: 'a-1',
            type: 'b1'
          },
          {
            pattern: 'a*',
            index: 'a-2',
            type: 'b2'
          }
        ];

        init(holder, mappings);

        $scope.c.indexPattern = 'a-1';
        $scope.$digest();

        $httpBackend.flush();

        expect($scope.c.index).to.be('a-1');
        expect($scope.c.type).to.be.null;
      });

      it('should unset id related parameter and column when index pattern is changed', function () {
        var holder = {
          entityURI: 'a*/b1/c/area'
        };
        var mappings = [
          {
            pattern: 'a*',
            index: 'a-1',
            type: 'b1'
          },
          {
            pattern: 'a*',
            index: 'a-2',
            type: 'b2'
          }
        ];

        init(holder, mappings);

        $scope.c.indexPattern = 'a-1';
        $scope.$digest();

        $httpBackend.flush();

        expect($scope.c.index).to.be('a-1');
        expect($scope.c.type).to.be.empty;
        expect($scope.c.id).to.be.empty;
        expect($scope.c.extraIdItems.length).to.be(0);
      });

      it('should unset id related parameter and column when type is changed', function () {
        var holder = {
          entityURI: 'a-1/b1/c/area'
        };
        var mappings = [
          {
            pattern: 'a*',
            index: 'a-1',
            type: 'b1'
          },
          {
            pattern: 'a*',
            index: 'a-2',
            type: 'b2'
          }
        ];

        init(holder, mappings);

        $scope.c.type = '';
        $scope.$digest();

        $httpBackend.flush();

        expect($scope.c.indexPattern).to.be('a-1');
        expect($scope.c.type).to.be.empty;
        expect($scope.c.id).to.be.empty;
        expect($scope.c.extraIdItems.length).to.be(0);
      });

      it('should handle a wildcard query returning more than one hit for the sample selection', function () {
        var holder = {
          entityURI: 'm*/t/c/area'
        };
        var mappings = [
          {
            pattern: 'm*',
            index: 'm-1',
            type: 't'
          },
          {
            pattern: 'm*',
            index: 'm-2',
            type: 't'
          }
        ];

        init(holder, mappings);
        $httpBackend.flush();

        expect(Notifier.prototype.warning.called).to.be(true);
        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be('m*');
        expect($scope.c.index).to.be('m-1');
        expect($scope.c.type).to.be('t');
        expect($scope.c.id).to.be('c');
        expect($scope.c.column).to.be('area');
      });

      it('should handle a wildcard query returning no hits for the sample selection', function () {
        var holder = {
          entityURI: 'n*/t/c/area'
        };
        var mappings = [
          {
            pattern: 'n*',
            index: 'n-1',
            type: 't'
          },
          {
            pattern: 'n*',
            index: 'n-2',
            type: 't'
          }
        ];

        init(holder, mappings);
        $httpBackend.flush();

        expect(Notifier.prototype.warning.called).to.be(true);
        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be.empty;
        expect($scope.c.index).to.be.empty;
        expect($scope.c.type).to.be.empty;
        expect($scope.c.id).to.be.empty;
        expect($scope.c.column).to.be.empty;
      });

      it('should handle an ES error', function () {
        var holder = {
          entityURI: 'e*/t/c/area'
        };
        var mappings = [
          {
            pattern: 'e*',
            index: 'e-1',
            type: 't'
          },
          {
            pattern: 'e*',
            index: 'e-2',
            type: 't'
          }
        ];

        init(holder, mappings);
        $httpBackend.flush();

        expect(Notifier.prototype.error.called).to.be(true);
        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be.empty;
        expect($scope.c.index).to.be.empty;
        expect($scope.c.type).to.be.empty;
        expect($scope.c.id).to.be.empty;
        expect($scope.c.column).to.be.empty;
      });

    });
  });
});
