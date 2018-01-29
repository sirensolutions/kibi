import { uiModules } from 'ui/modules';
import createEidTemplate from './create_eid.html';
import _ from 'lodash';
const module = uiModules.get('kibana');

module.directive('createEid', function () {
  return {
    restrict: 'E',
    template: createEidTemplate,
    replace: true,
    link: function ($scope) {

    },
    controller: function ($scope, kbnUrl, ontologyClient) {
      $scope.createEntityIdentifier = function (overrideUrl) {
        const {
          name,
          shortDescription,
          longDescription,
          icon,
          color
        } = this.formValues;
        return ontologyClient.insertEntity(name, name, 'VIRTUAL_ENTITY', icon, color, shortDescription, longDescription,
          null, null)
        .then(() => {
          kbnUrl.change(`/management/siren/indexesandrelations/${name}`);
        });
      };
    }
  };
});
