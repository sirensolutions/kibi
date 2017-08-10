import 'ui/kibi/directives/kibi_angular_qtip2';
import 'ui/kibi/directives/kibi_select_dashboard.less';
import uiModules from 'ui/modules';
import kibiUtils from 'kibiutils';
import _ from 'lodash';
import kibiSelectDashboardTemplate from 'ui/kibi/directives/kibi_select_dashboard.html';

uiModules.get('kibana')
.directive('kibiSelectDashboard', function (Private, dashboardGroups) {

  return {
    require: 'ngModel',
    replace: true,
    scope: {
      multiSelect: '=?',
      dashboardArray: '=?',
      qtipTooltip: '=?',
      qtipOptions: '=?',
      titleLimit: '@?',
      disableMessage: '@?'
    },
    template: kibiSelectDashboardTemplate,
    link: function (scope, element, attrs, ngModelCtrl, kibiState) {

      let dashboardGroupList = [];
      // virtualGroups is used for displaying virtual groups as one group
      const virtualGroup = {
        title: 'Other',
        dashboards: []
      };

      const populateDashboardGroups = function () {
        const groups = dashboardGroups.getGroups();

        _.each(groups, function (group) {
          const groupItem = {};
          groupItem.dashboards = [];
          if (group.virtual) {
            virtualGroup.dashboards.push(group.dashboards[0]);
          } else {
            groupItem.title = group.title;
            groupItem.id = group.id;
            groupItem.dashboards = _.sortBy(group.dashboards, 'title');
            dashboardGroupList.push(groupItem);
          }
        });

        dashboardGroupList =  _.sortBy(dashboardGroupList, 'title');
        if(virtualGroup.dashboards.length > 0) {
          virtualGroup.dashboards = _.sortBy(virtualGroup.dashboards, 'title');
          return dashboardGroupList.concat(new Array(virtualGroup));
        } else {
          return dashboardGroupList;
        }
      };

      const _render = function   () {

        if (scope.dashboardArray) {
          scope.dashboardGroups = scope.dashboardArray;
        } else {
          scope.dashboardGroups = populateDashboardGroups();
        }
      };


      const _setViewValue = function (selectedDashboard) {
        if (selectedDashboard) {
          ngModelCtrl.$setViewValue(selectedDashboard);
        } else {
          ngModelCtrl.$setViewValue(null);
        }
      };

      scope.$watch('selectedDashboard', function (newValue, oldValue, myScope) {
        if (newValue) {
          _setViewValue(newValue);
        }
      }, true);

      function setModelObject() {
        scope.selectedDashboard = ngModelCtrl.$viewValue;
      }

      scope.$watch(
        function () {
          return ngModelCtrl.$modelValue;
        },
        setModelObject.bind(this)
      );
      setModelObject();

      // init
      _render(scope);
    }

  };
});
