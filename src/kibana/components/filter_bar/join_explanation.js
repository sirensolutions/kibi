define(function (require) {
  return function JoinExplanationFactory(Private) {

    function JoinExplanationHelper() {}

    JoinExplanationHelper.prototype = (function () {

      var fieldFormat = Private(require('registry/field_formats'));
      var _ = require('lodash');

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

      var createLabel = function (f, indexId, indexes) {
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

      return {
        createLabel: createLabel
      };
    })();

    return new JoinExplanationHelper();
  };
});
