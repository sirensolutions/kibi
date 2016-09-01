const _ = require('lodash');
const angular = require('angular');
const saveAs = require('@spalger/filesaver').saveAs;

module.exports = function (data, $http) {
  return function () {

    function formatResults(header, results) {
      return '========================================================\n' +
             header + '\n' +
             '========================================================\n' +
             angular.toJson(results, true) + '\n';
    };

    let esUrls = [
      '_cluster/stats?human&pretty',
      '_nodes/_all?human&pretty',
      '_stats?human&pretty',
      '_segments?human&pretty&verbose=true',
      '_mapping?human&pretty'
    ];
    let promises = _.map(esUrls, (urlPart) => {
      return $http.get('elasticsearch/' + urlPart).then((results) => {
        return formatResults(urlPart, results.data);
      });
    });
    promises.push(Promise.resolve(formatResults('kibi metrics', data.metrics)));
    promises.push(Promise.resolve(formatResults('kibi plugin statuses', data.statuses)));

    Promise.all(promises).then((results) => {
      const blob = new Blob([results.join('\n')], {type: 'application/text'});
      saveAs(blob, 'diagniostics.txt');
    });
  };
};
