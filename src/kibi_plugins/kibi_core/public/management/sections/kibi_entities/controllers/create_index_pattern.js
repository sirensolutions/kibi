import { uiModules } from 'ui/modules';
import createIndexPatternTemplate from './create_index_pattern.html';
import _ from 'lodash';
import 'plugins/kibana/management/sections/indices/create_index_pattern/create_index_pattern';
const module = uiModules.get('kibana');

module.directive('createIndexPattern', function () {
  return {
    restrict: 'E',
    template: createIndexPatternTemplate,
    replace: true,
    link: function ($scope) {

    }
  };
});
