import $ from 'jquery';
import { remove } from 'lodash';

import './kbn_chrome.less';
import { uiModules } from 'ui/modules';
import { isSystemApiRequest } from 'ui/system_api';
import {
  getUnhashableStatesProvider,
  unhashUrl,
} from 'ui/state_management/state_hashing';
import { notify } from 'ui/notify';
import { SubUrlRouteFilterProvider } from './sub_url_route_filter';

export function kbnChromeProvider(chrome, internals) {

  uiModules
  .get('kibana')
  .directive('kbnChrome', () => {
    return {
      template() {
        const $content = $(require('./kbn_chrome.html'));
        const $app = $content.find('.application');

        if (internals.rootController) {
          $app.attr('ng-controller', internals.rootController);
        }

        if (internals.rootTemplate) {
          $app.removeAttr('ng-view');
          $app.html(internals.rootTemplate);
        }

        return $content;
      },

      controllerAs: 'chrome',
      controller($scope, $rootScope, $location, $http, Private) {

        // are we showing the embedded version of the chrome?
        internals.setVisibleDefault(!$location.search().embed);
        // kibi: added to be able to share dashboards with visible kibi-nav-bar
        if (!chrome.getVisible()) {
          internals.setKibiNavbarVisibleDefault($location.search().kibiNavbarVisible);
        }
        // kibi: end

        const subUrlRouteFilter = Private(SubUrlRouteFilterProvider);

        function updateSubUrls() {
          const urlWithHashes = window.location.href;
          // kibi: set URLs with hashes otherwise they might overflow
          internals.trackPossibleSubUrl(urlWithHashes);
          // kibi: end
        }

        function onRouteChange($event) {
          if (subUrlRouteFilter($event)) {
            updateSubUrls();
          }
        }

        $rootScope.$on('$routeChangeSuccess', onRouteChange);
        $rootScope.$on('$routeUpdate', onRouteChange);
        updateSubUrls(); // initialize sub urls

        const allPendingHttpRequests = () => $http.pendingRequests;
        const removeSystemApiRequests = (pendingHttpRequests = []) => remove(pendingHttpRequests, isSystemApiRequest);
        $scope.$watchCollection(allPendingHttpRequests, removeSystemApiRequests);

        // and some local values
        chrome.httpActive = $http.pendingRequests;
        $scope.notifList = notify._notifs;

        return chrome;
      }
    };
  });

}
