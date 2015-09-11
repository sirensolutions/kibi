define(function (require) {
  return function JoinExplanationFactory(Private, indexPatterns, Promise, $timeout) {

    var jQuery = require('jquery');
    var qtip = require('qtip2');
    require('css!bower_components/qtip2/jquery.qtip.min.css');

    function JoinExplanationHelper() {}

    JoinExplanationHelper.prototype = (function () {

      var fieldFormat = Private(require('registry/field_formats'));
      var _ = require('lodash');

      // the set of index patterns
      var indexes;

      /**
       * Format the value as a date if the field type is date
       */
      function formatDate(fields, fieldName, value) {
        var field = _.find(fields, function (field) {
          return field.name === fieldName;
        });
        if (field && field.type === 'date') {
          var format = field.format;
          if (!format) {
            format = fieldFormat.getDefaultInstance('date');
          }
          return format.convert(value, 'html');
        }
        return value;
      }

      function formatMatch(f, matchType) {
        var match = Object.keys(f.query[matchType])[0];
        var matchQuery = f.query[matchType][match];

        if (matchQuery.constructor === Object) {
          return ' match on ' + match + ': <b>' + matchQuery.query + '</b> ';
        } else {
          return ' match on ' + match + ': <b>' + matchQuery + '</b> ';
        }
      }

      var createLabel = function (f, indexId) {
        if (!indexes) {
          return '';
        }
        var fields = indexes[indexId].fields;
        var prop;
        if (f.query && f.query.query_string && f.query.query_string.query) {
          return ' query: <b>' + f.query.query_string.query + '</b> ';
        } else if (f.query && f.query.match) {
          return formatMatch(f, 'match');
        } else if (f.query && f.query.match_phrase) {
          return formatMatch(f, 'match_phrase');
        } else if (f.query && f.query.match_phrase_prefix) {
          return formatMatch(f, 'match_phrase_prefix');
        } else if (f.range) {
          prop = Object.keys(f.range)[0];
          return ' ' + prop + ': <b>' + formatDate(fields, prop, f.range[prop].gte) +
            '</b> to <b>' + formatDate(fields, prop, f.range[prop].lte) + '</b> ';
        } else if (f.dbfilter) {
          return ' ' + (f.dbfilter.negate ? 'NOT' : '') + ' dbfilter: <b>' + f.dbfilter.queryid + '</b> ';
        } else if (f.or) {
          return ' or filter <b>' + f.or.length + ' terms</b> ';
        } else if (f.exists) {
          return ' exists: <b>' + f.exists.field + '</b> ';
        } else if (f.script) {
          return ' script: script:<b>' + f.script.script + '</b> params: <b>' + f.script.params + '</b> ';
        } else if (f.missing) {
          return ' missing: <b>' + f.missing.field + '</b> ';
        } else if (f.not) {
          return ' NOT' + createLabel(f.not, indexId, indexes);
        } else if (f.geo_bounding_box) {
          prop = Object.keys(f.geo_bounding_box)[0];
          return ' ' + prop + ': <b>' + JSON.stringify(f.geo_bounding_box[prop].top_left, null, '') + '</b> to <b>'
            + JSON.stringify(f.geo_bounding_box[prop].bottom_right, null, '') + '</b> ';
        } else {
          return ' <font color="red">Unable to pretty print the filter:</font> ' +
            JSON.stringify(_.omit(f, '$$hashKey'), null, ' ') + ' ';
        }
      };

      /**
       * get the indexes from the join filters
       */
      var setIndexesFromJoinFilter = function (filters) {
        var promises = _.chain(filters)
          .filter(function (filter) {
            return !!filter.join;
          }).map(function (filter) {
            return filter.join.indexes;
          })
        .flatten()
          .map(function (index) {
            return indexPatterns.get(index.id);
          })
        .value();

        return Promise.all(promises).then(function (data) {
          indexes = _.object(_.map(data, 'id'), data);
          jQuery('.qtip').qtip('destroy', true);
          $timeout(function () {
            jQuery('.filter.join').qtip({
              content: {
                title: 'Relations',
                text: jQuery('.filter.join .explanation').html()
              },
              position: {
                my: 'top left',
                at: 'bottom center'
              },
              style: {
                classes: 'qtip-light qtip-rounded qtip-shadow'
              }
            });
          });
        });
      };

      return {
        createLabel: createLabel,
        setIndexesFromJoinFilter: setIndexesFromJoinFilter,
        get indexes () {
          return indexes;
        }
      };
    })();

    return new JoinExplanationHelper();
  };
});
