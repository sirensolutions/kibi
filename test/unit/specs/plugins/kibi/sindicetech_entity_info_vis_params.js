define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  require('plugins/sindicetech/sindicetech_entity_info_vis/sindicetech_entity_info_vis_params');

  var $rootScope;

  var init = function (options) {
    // Load the application
    module('kibana', function ($provide) {
      // mock the st-select directive with an empty one
      $provide.factory('stSelectDirective', function () { return [ { restrict: 'E' } ]; });
    });

    module('queries_editor/services/saved_queries', function ($provide) {
      $provide.service('savedQueries', require('fixtures/fake_saved_queries'));
    });

    // Create the scope
    inject(function (_$rootScope_, $compile) {
      var $elem = angular.element('<sindicetech-entity-info-vis-params></sindicetech-entity-info-vis-params>');

      $rootScope = _$rootScope_;
      $rootScope.vis = {
        params : {
          queryOptions: options.queryOptions && options.queryOptions || [],
          enableQueryFields: options.enableQueryFields
        }
      };

      $compile($elem)($rootScope);
    });
  };

  describe('Kibi Directives', function () {
    describe('templated query viewer directive', function () {
      it('should parse the custom template variables', function () {
        var options = {
          queryOptions: [
            {
              queryId: 123,
              _templateVarsString: JSON.stringify({ a: 'b' }, null, ' ')
            }
          ]
        };

        init(options);
        $rootScope.$digest();
        expect(options.queryOptions[0].templateVars).to.be.eql({ a: 'b', label: '' });
      });

      it('should set the label variable 1', function () {
        var options = {
          queryOptions: [
            {
              queryId: 123,
              _label: 'dog'
            }
          ]
        };

        init(options);
        $rootScope.$digest();
        expect(options.queryOptions[0].templateVars).to.be.eql({ label: 'dog' });
      });

      it('should set the label variable 2', function () {
        var options = {
          queryOptions: [
            {
              queryId: 123,
              _templateVarsString: JSON.stringify({ label: 'b' }, null, ' ')
            }
          ]
        };

        init(options);
        $rootScope.$digest();
        expect(options.queryOptions[0].templateVars).to.be.eql({ label: 'b' });
      });

      it('should not enable the entity', function (done) {
        var options = {
          queryOptions: [
            {
              queryId: 'query1'
            }
          ],
          enableQueryFields: false
        };

        init(options);
        $rootScope.$on('kibi:entityURIEnabled:entityinfo', function (event, isEnabled) {
          expect(isEnabled).to.be(false);
          done();
        });
        $rootScope.$digest();
      });

      it('should enable the entity', function (done) {
        var options = {
          queryOptions: [
            {
              queryId: 'query1'
            }
          ],
          enableQueryFields: true
        };

        init(options);
        $rootScope.$on('kibi:entityURIEnabled:entityinfo', function (event, isEnabled) {
          expect(isEnabled).to.be(true);
          done();
        });
        $rootScope.$digest();
      });
    });
  });
});
