const _ = require('lodash');
const angular = require('angular');
const saveAs = require('@spalger/filesaver').saveAs;
const esUrls = require('./kibi_es_apis_calls');

module.exports = function (data, $http, kibiIndexName, $window) {
  return function () {

    function formatResults(header, results) {
      return '========================================================\n' +
             header + '\n' +
             '========================================================\n' +
             angular.toJson(results, true) + '\n';
    };


    $http.get('elasticsearch/' + kibiIndexName + '/index-pattern/_search')
    .then(function (indexPatternRes) {
      if (_.get(indexPatternRes, 'data.hits.hits')) {
        var indexes = _.map(indexPatternRes.data.hits.hits, (hit) => { return hit._id;});
        let promises = _.map(esUrls, (urlPart) => {
          // get list of index patterns
          var url = urlPart.replace(/\$KIBI_INDICES_LIST/, indexes.join(','));
          return $http.get('elasticsearch/' + url).then((results) => {
            return formatResults(urlPart, results.data);
          });
        });
        promises.push(Promise.resolve(formatResults('kibi metrics', data.metrics)));
        promises.push(Promise.resolve(formatResults('kibi plugin statuses', data.statuses)));

        Promise.all(promises).then((results) => {
          const blob = new Blob([results.join('\n')], {type: 'application/text'});
          saveAs(blob, 'diagniostics.txt');
        });
      }
    }).catch((err) => {
      $window.alert('Could not collect diagnostics\n' + JSON.stringify(err, null, ' '));
    });

  };
};
