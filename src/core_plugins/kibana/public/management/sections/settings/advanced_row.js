import 'ui/elastic_textarea';
import 'ui/filters/markdown';
import uiModules from 'ui/modules';
import advancedRowTemplate from 'plugins/kibana/management/sections/settings/advanced_row.html';

uiModules.get('apps/management')
.directive('advancedRow', function (config, createNotifier) {
  return {
    restrict: 'A',
    replace: true,
    template: advancedRowTemplate,
    scope: {
      conf: '=advancedRow',
      configs: '='
    },
    link: function ($scope) {
      const notify = createNotifier();
      const keyCodes = {
        ESC: 27
      };

      // To allow passing form validation state back
      $scope.forms = {};

      // setup loading flag, run async op, then clear loading and editing flag (just in case)
      const loading = function (conf, fn) {
        conf.loading = true;
        fn()
          .then(function () {
            conf.loading = conf.editing = false;
          })
          // siren: cancel edit and notify error
          .catch((error) => {
            config.set(conf.name, conf.defVal);
            notify.error(error);
          });
          // siren: end
      };

      $scope.maybeCancel = function ($event, conf) {
        if ($event.keyCode === keyCodes.ESC) {
          $scope.cancelEdit(conf);
        }
      };

      $scope.edit = function (conf) {
        conf.unsavedValue = conf.value == null ? conf.defVal : conf.value;
        $scope.configs.forEach(function (c) {
          c.editing = (c === conf);
        });
      };

      $scope.save = function (conf) {
        loading(conf, function () {
          if (conf.unsavedValue === conf.defVal) {
            return config.remove(conf.name);
          }

          // siren: added to allow for custom validation step before saving the value
          let value = conf.unsavedValue;
          if (conf.validator) {
            value = $scope.validator(conf.validator, conf.unsavedValue);
            if (value instanceof Error) {
              conf.loading = false;
              return Promise.reject(`Wrong value set for: ${conf.name}. ${value.message}`);
            }
          }
          return config.set(conf.name, value);
          // siren: end
        });
      };

      $scope.cancelEdit = function (conf) {
        conf.editing = false;
      };

      $scope.clear = function (conf) {
        return loading(conf, function () {
          return config.remove(conf.name);
        });
      };

      // siren: custom validator for value
      $scope.validator = function (validator, val) {
        switch (validator) {
          case 'positiveIntegerValidator':
            if (!/^\+?(0|[1-9]\d*)$/.test(val)) {
              return new Error('Should be positive integer but was [' + val + '].');
            }
            return parseInt(val);
          default:
            return new Error('Unknown validator [' + validator + '] for [' + val + '].');
        }
      };
      //  siren: end

      $scope.isDefaultValue = (conf) => {
        // conf.isCustom = custom setting, provided by user, so there is no notion of
        // having a default or non-default value for it
        return conf.isCustom
          || conf.value === undefined
          || conf.value === ''
          || String(conf.value) === String(conf.defVal);
      };
    }
  };
});
