define(function (require) {

  var reqRespStatsHTML = require('text!components/visualize/spy/_req_resp_stats.html');
  require('components/clipboard/clipboard');

  var linkReqRespStats = function ($scope, config) {
    $scope.$bind('req', 'searchSource.history[searchSource.history.length - 1]');
    $scope.$watchMulti([
      'req',
      'req.started',
      'req.stopped',
      'searchSource'
    ], function () {
      if (!$scope.searchSource || !$scope.req) {
        return;
      }

      var req = $scope.req;
      var resp = $scope.req.resp;

      if (resp && resp.took !== null) {
        $scope.stats.push(['Query Duration', resp.took + 'ms']);
      }
      if (req && req.ms !== null) {
        $scope.stats.push(['Request Duration', req.ms + 'ms']);
      }
      if (resp && resp.hits) {
        $scope.stats.push(['Hits', resp.hits.total]);
      }

      if (req.fetchParams.index) {
        $scope.stats.push(['Index', req.fetchParams.index]);
      }
      if (req.fetchParams.type) {
        $scope.stats.push(['Type', req.fetchParams.type]);
      }
      if (req.fetchParams.id) {
        $scope.stats.push(['Id', req.fetchParams.id]);
      }
    });
  };

  require('registry/spy_modes')
  .register(function () {
    return {
      name: 'request',
      display: 'Request',
      order: 2,
      template: reqRespStatsHTML,
      link: linkReqRespStats
    };
  })
  .register(function () {
    return {
      name: 'response',
      display: 'Response',
      order: 3,
      template: reqRespStatsHTML,
      link: linkReqRespStats
    };
  })
  .register(function () {
    return {
      name: 'stats',
      display: 'Statistics',
      order: 4,
      template: reqRespStatsHTML,
      link: linkReqRespStats
    };
  });
});