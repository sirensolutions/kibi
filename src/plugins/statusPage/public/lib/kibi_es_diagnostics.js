const _ = require('lodash');
const angular = require('angular');
const notify = require('ui/notify');
const saveAs = require('@spalger/filesaver').saveAs;
const esUrls = require('./kibi_es_apis_calls');

module.exports = function (data, $http, kibiIndexName) {
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
        let indexes = _.map(indexPatternRes.data.hits.hits, (hit) => hit._id).join(',');
        let promises = _.map(esUrls, (urlPart) => {
          // get list of index patterns
          let url = urlPart.replace(/\$KIBI_INDICES_LIST/, indexes);
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
      const error = new Error('Could not collect diagnostics');
      error.stack = err.data.message;
      notify.error(error);
    });

  };
};
