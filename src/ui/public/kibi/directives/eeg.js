import { uiModules } from 'ui/modules';
import Eeg from 'kibi-eeg';
import chrome from 'ui/chrome';
import { endsWith } from 'lodash';

uiModules
.get('kibana')
.directive('eeg', function ($rootScope) {
  return {
    restrict: 'E',
    replace:true,
    scope: {
      eegId: '=',
      // we expect the graph to contain
      // nodes: []
      // links: [
      // option: {}
      // nodes and links and option format same as in Eeg
      graph: '=?'
    },
    template: '<div></div>',
    link: function ($scope, element, attrs) {
      const layersOrder = ['legend', 'links', 'linksLabelsBack', 'nodes', 'linksLabels'];
      const minNodeSize = 15;
      let baseURL = chrome.getBasePath();
      if (baseURL && !endsWith(baseURL, '/')) {
        baseURL += '/';
      }
      if ($scope.graph === undefined) {
        element.empty();
        if ($scope.g) {
          $scope.g.destroy();
        }
        $scope.g = new Eeg(element, { baseURL, layersOrder, minNodeSize });
      }

      $scope.$watch('graph', function (graph) {
        if (graph) {
          element.empty();

          if ($scope.graph.options) {
            if ($scope.g) {
              $scope.g.destroy();
            }
            $scope.graph.options.baseURL = baseURL;
            $scope.graph.options.layersOrder = layersOrder;
            $scope.graph.options.minNodeSize = minNodeSize;
            $scope.g = new Eeg(element, $scope.graph.options);
          }

          if ($scope.graph.nodes) {
            $scope.g.addNodes($scope.graph.nodes);
          }
          if ($scope.graph.links) {
            $scope.g.addLinks($scope.graph.links);
          }
          $rootScope.$emit('egg:' + $scope.eegId + ':results', 'exportGraph', $scope.g.exportGraph());
        }
      });

      const off = $rootScope.$on('egg:' + $scope.eegId + ':run', function (event, method) {
        if ($scope.g) {
          if (method === 'importGraph') {
            element.empty();
          }

          const args = Array.prototype.slice.apply(arguments);
          args.shift();
          args.shift();
          const result = $scope.g[method].apply($scope.g, args);
          $rootScope.$emit('egg:' + $scope.eegId + ':results', method, result);
        }
      });
      $scope.$on('$destroy', () => {
        $scope.g.destroy();
        off();
      });
    }
  };
});
