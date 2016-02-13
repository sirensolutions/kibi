define(function (require) {
  var _ = require('lodash');
  var typeahead = require('ui/modules').get('kibana/typeahead');

  require('ui/notify/directives');

  typeahead.directive('kbnTypeaheadInput', function ($rootScope) {

    return {
      restrict: 'A',
      require: ['^ngModel', '^kbnTypeahead'],

      link: function ($scope, $el, $attr, deps) {
        var model = deps[0];
        var typeaheadCtrl = deps[1];

        typeaheadCtrl.setInputModel(model);

        // disable browser autocomplete
        $el.attr('autocomplete', 'off');

        // handle keypresses
        $el.on('keydown', function (ev) {
          typeaheadCtrl.keypressHandler(ev);
          digest();
        });

        // update focus state based on the input focus state
        $el.on('focus', function () {
          typeaheadCtrl.setFocused(true);
          digest();
        });

        $el.on('blur', function () {
          typeaheadCtrl.setFocused(false);
          digest();
          // kibi: still needed ?
          // https://github.com/sirensolutions/kibi-private/issues/161
          //$timeout(function () {
            //// kibi: added timeout to avoid digest cycle conflict that appeared with kibiArrayParam* directives
            //$scope.$apply();
          //});
          // kibi: end
        });

        // unbind event listeners
        $scope.$on('$destroy', function () {
          $el.off();
        });

        function digest() {
          $rootScope.$$phase || $scope.$digest();
        }
      }
    };
  });
});
