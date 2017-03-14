define(function (require) {
  const _ = require('lodash');
  const angular = require('angular');
  const rison = require('ui/utils/rison');
  const registry = require('plugins/kibana/settings/saved_object_registry');
  const objectViewHTML = require('plugins/kibana/settings/sections/objects/_view.html');

  require('ui/routes')
  .when('/settings/objects/:service/:id', {
    template: objectViewHTML
  });

  require('ui/modules').get('apps/settings')
  .directive('kbnSettingsObjectsView', function (kbnIndex) {
    return {
      restrict: 'E',
      controller: function ($scope, $injector, $routeParams, $location, $window, $rootScope,
        savedObjectsAPI, Private, queryEngineClient, createNotifier) { // kibi: replaced es with savedObjectsAPI
        const notify = createNotifier({ location: 'SavedObject view' });
        const castMappingType = Private(require('ui/index_patterns/_cast_mapping_type'));
        const serviceObj = registry.get($routeParams.service);
        const service = $injector.get(serviceObj.service);

        const deleteHelper = Private(require('ui/kibi/helpers/delete_helper')); // kibi: added by kibi
        /**
         * Creates a field definition and pushes it to the memo stack. This function
         * is designed to be used in conjunction with _.reduce(). If the
         * values is plain object it will recurse through all the keys till it hits
         * a string, number or an array.
         *
         * @param {array} memo The stack of fields
         * @param {mixed} value The value of the field
         * @param {string} key The key of the field
         * @param {object} collection This is a reference the collection being reduced
         * @param {array} parents The parent keys to the field
         * @returns {array}
         */
        const createField = function (memo, val, key, collection, parents) {
          if (_.isArray(parents)) {
            parents.push(key);
          } else {
            parents = [key];
          }

          const field = { type: 'text', name: parents.join('.'), value: val };

          if (_.isString(field.value)) {
            try {
              field.value = angular.toJson(JSON.parse(field.value), true);
              field.type = 'json';
            } catch (err) {
              field.value = field.value;
            }
          } else if (_.isNumeric(field.value)) {
            field.type = 'number';
          } else if (_.isArray(field.value)) {
            field.type = 'array';
            field.value = angular.toJson(field.value, true);
          } else if (_.isBoolean(field.value)) {
            field.type = 'boolean';
            field.value = field.value;
          } else if (_.isPlainObject(field.value)) {
            // do something recursive
            return _.reduce(field.value, _.partialRight(createField, parents), memo);
          }

          memo.push(field);

          // once the field is added to the object you need to pop the parents
          // to remove it since we've hit the end of the branch.
          parents.pop();
          return memo;
        };

        const readObjectClass = function (fields, Class) {
          const fieldMap = _.indexBy(fields, 'name');

          _.forOwn(Class.mapping, function (esType, name) {
            if (fieldMap[name]) return;

            fields.push({
              name: name,
              type: (function () {
                switch (castMappingType(esType)) {
                  case 'string': return 'text';
                  case 'number': return 'number';
                  case 'boolean': return 'boolean';
                  default: return 'json';
                }
              }())
            });
          });

          if (Class.searchSource && !fieldMap['kibanaSavedObjectMeta.searchSourceJSON']) {
            fields.push({
              name: 'kibanaSavedObjectMeta.searchSourceJSON',
              type: 'json',
              value: '{}'
            });
          }
        };

        $scope.notFound = $routeParams.notFound;

        $scope.title = service.type;

        savedObjectsAPI.get({
          index: kbnIndex,
          type: service.type,
          id: $routeParams.id
        })
        .then(function (obj) {
          $scope.obj = obj;
          $scope.link = service.urlFor(obj._id);

          const fields =  _.reduce(obj._source, createField, []);
          if (service.Class) readObjectClass(fields, service.Class);
          $scope.fields = _.sortBy(fields, 'name');
        })
        .catch(notify.fatal);

        // This handles the validation of the Ace Editor. Since we don't have any
        // other hooks into the editors to tell us if the content is valid or not
        // we need to use the annotations to see if they have any errors. If they
        // do then we push the field.name to aceInvalidEditor variable.
        // Otherwise we remove it.
        const loadedEditors = [];
        $scope.aceInvalidEditors = [];

        $scope.aceLoaded = function (editor) {
          if (_.contains(loadedEditors, editor)) return;
          loadedEditors.push(editor);

          editor.$blockScrolling = Infinity;

          const session = editor.getSession();
          const fieldName = editor.container.id;

          session.setTabSize(2);
          session.setUseSoftTabs(true);
          session.on('changeAnnotation', function () {
            const annotations = session.getAnnotations();
            if (_.some(annotations, { type: 'error'})) {
              if (!_.contains($scope.aceInvalidEditors, fieldName)) {
                $scope.aceInvalidEditors.push(fieldName);
              }
            } else {
              $scope.aceInvalidEditors = _.without($scope.aceInvalidEditors, fieldName);
            }

            if ($rootScope.$$phase) $scope.$apply();
          });
        };

        $scope.cancel = function () {
          $window.history.back();
          return false;
        };

        /**
         * Deletes an object and sets the notification
         * @param {type} name description
         * @returns {type} description
         */
        $scope.delete = function () {

          // kibi: wrapped the original function
          // as we need to do our checks before
          const _delete = function () {
            savedObjectsAPI.delete({
              index: kbnIndex,
              type: service.type,
              id: $routeParams.id
            })
            .then(function (resp) {
              // this should be emited also from other places
              $rootScope.$emit('kibi:' + service.type + ':changed', resp); // kibi: kibi event
              $rootScope.$emit('kibi:' + service.type + ':changed:deleted', resp); // kibi: kibi event
              return redirectHandler('deleted');
            })
            .catch(notify.error); // kibi: changed from fatal to error
          };

          deleteHelper.deleteByType(service.type, [$routeParams.id], _delete);
          // kibi: end
        };

        $scope.submit = function () {
          const source = _.cloneDeep($scope.obj._source);

          _.each($scope.fields, function (field) {
            let value = field.value;

            if (field.type === 'number') {
              value = Number(field.value);
            }

            if (field.type === 'array') {
              value = JSON.parse(field.value);
            }

            _.set(source, field.name, value);
          });

          savedObjectsAPI.index({
            index: kbnIndex,
            type: service.type,
            id: $routeParams.id,
            body: source
          })
          .then(function (resp) {

            // kibi: flush the cache on the server side
            if (service.type === 'query' || service.type === 'template' || service.type === 'script') {
              queryEngineClient.clearCache().then(function () {
              });
            }
            $rootScope.$emit('kibi:' + service.type + ':changed', resp);
            // kibi: end

            return redirectHandler('updated');
          })
          .catch((error) => {
            // kibi: notify errors
            notify.error(error);
            throw error;
          });
        };

        function redirectHandler(action) {
          // kibi: removed refresh
          const msg = 'You successfully ' + action + ' the "' + $scope.obj._source.title + '" ' + $scope.title.toLowerCase() + ' object';

          $location.path('/settings/objects').search({
            _a: rison.encode({
              tab: serviceObj.title
            })
          });
          notify.info(msg);
        }

        // kibi: methods to identify our fields
        const kibiFields = [
          {name: 'activationQuery', size: 1},
          {name: 'resultQuery',     size: 4},
          {name: 'templateVars',    size: 2}
        ];

        $scope.isItKibiField = function (field) {
          let ret = false;
          _.each(kibiFields, function (stField) {
            if (stField.name === field.name) {
              ret = true;
              return false;
            }
          });
          return ret;
        };
        $scope.computeKibiFieldTextareaSize = function (field) {
          let size = 1;
          _.each(kibiFields, function (stField) {
            if (stField.name === field.name) {
              size = stField.size;
              return false;
            }
          });
          return size;
        };
        // kibi: end
      }
    };
  });
});
