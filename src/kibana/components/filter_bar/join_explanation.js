define(function (require) {
  return function JoinExplanationFactory(Private, indexPatterns, Promise, $timeout) {

    var jQuery = require('jquery');
    var qtip = require('qtip2');
    require('css!bower_components/qtip2/jquery.qtip.min.css');

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

      var initQtip = function (explanations) {
        jQuery('.qtip').qtip('destroy', true);
        $timeout(function () {

          jQuery('.filter').each(function (index) {
            var $el = jQuery(this);
            if ($el.hasClass('join')) {
              $el.qtip({
                content: {
                  title: 'Steps - last one on top',
                  text: explanations[index]
                },
                position: {
                  my: 'top left',
                  at: 'bottom center'
                },
                hide: {
                  event: 'unfocus'
                },
                style: {
                  classes: 'qtip-light qtip-rounded qtip-shadow'
                }
              });
            }
          });
        });
        return Promise.resolve('done');
      };


      var createFilterLabel = function (f, fields) {
        return new Promise(function (fulfill, reject) {
          var prop;
          if (f.query && f.query.query_string && f.query.query_string.query) {
            fulfill(' query: <b>' + f.query.query_string.query + '</b> ');
          } else if (f.query && f.query.match) {
            fulfill(formatMatch(f, 'match'));
          } else if (f.query && f.query.match_phrase) {
            fulfill(formatMatch(f, 'match_phrase'));
          } else if (f.query && f.query.match_phrase_prefix) {
            fulfill(formatMatch(f, 'match_phrase_prefix'));
          } else if (f.range) {
            prop = Object.keys(f.range)[0];
            fulfill(' ' + prop + ': <b>' + formatDate(fields, prop, f.range[prop].gte) +
              '</b> to <b>' + formatDate(fields, prop, f.range[prop].lte) + '</b> ');
          } else if (f.dbfilter) {
            fulfill(' ' + (f.dbfilter.negate ? 'NOT' : '') + ' dbfilter: <b>' + f.dbfilter.queryid + '</b> ');
          } else if (f.or) {
            fulfill(' or filter <b>' + f.or.length + ' terms</b> ');
          } else if (f.exists) {
            fulfill(' exists: <b>' + f.exists.field + '</b> ');
          } else if (f.script) {
            fulfill(' script: script:<b>' + f.script.script + '</b> params: <b>' + f.script.params + '</b> ');
          } else if (f.missing) {
            fulfill(' missing: <b>' + f.missing.field + '</b> ');
          } else if (f.not) {
            createFilterLabel(f.not, fields).then(function (html) {
              fulfill(' NOT' + html);
            });
          } else if (f.geo_bounding_box) {
            prop = Object.keys(f.geo_bounding_box)[0];
            fulfill(' ' + prop + ': <b>' + JSON.stringify(f.geo_bounding_box[prop].top_left, null, '') + '</b> to <b>'
              + JSON.stringify(f.geo_bounding_box[prop].bottom_right, null, '') + '</b> ');
          } else if (f.join_set) {
            explainJoinSet(f.join_set).then(function (html) {
              fulfill('join_set: ' + html);
            });
          } else if (f.join_sequence) {
            explainJoinSequence(f.join_sequence).then(function (html) {
              fulfill('join_sequence: ' + html);
            });
          } else {
            fulfill(' <font color="red">Unable to pretty print the filter:</font> ' +
              JSON.stringify(_.omit(f, '$$hashKey'), null, ' ') + ' ');
          }
        });
      };


      var explainFilter = function (filter, indexId) {
        if (filter.range || filter.not) {
          // fields might be needed
          return indexPatterns.get(indexId).then(function (index) {
            return createFilterLabel(filter, index.fields);
          });
        } else {
          return Promise.resolve(createFilterLabel(filter));
        }
      };


      var explainFilterInMustNot = function (filter, indexId) {
        return explainFilter(filter, indexId).then(function (filterExplanation) {
          return 'NOT ' + filterExplanation;
        });
      };


      var explainQueries = function (queries, indexId) {

        var promises = [];
        _.each(queries, function (query) {
          // in our case we have filtered query for now
          if (query.query && query.query.filtered && query.query.filtered.query &&
             !(query.query.filtered.query.query_string &&
               query.query.filtered.query.query_string.query === '*' &&
               query.query.filtered.query.query_string.analyze_wildcard === true)
          ) {
            // only if the query is different than star query
            promises.push(explainFilter({query: query.query.filtered.query}, indexId));
          }

          if (query.query && query.query.filtered && query.query.filtered.filter && query.query.filtered.filter.bool) {
            var must = query.query.filtered.filter.bool.must;
            var must_not = query.query.filtered.filter.bool.must_not;
            if (must instanceof Array && must.length > 0) {
              _.each(must, function (filter) {
                promises.push(explainFilter(filter, indexId));
              });
            }
            if (must_not instanceof Array && must_not.length > 0) {
              _.each(must_not, function (filter) {
                promises.push(explainFilterInMustNot(filter, indexId));
              });
            }
          }
        });

        return Promise.all(promises).then(function (filterExplanations) {
          var html = '<ul>';
          _.each(filterExplanations, function (explanation) {
            html += '<li>' + explanation + '</li>';
          });
          return html + '</ul>';
        });
      };


      var explainRelation = function (el) {
        var relation = el.relation;

        var promises = [];
        if (relation[0].queries instanceof Array && relation[0].queries.length > 0) {
          promises.push(explainQueries(relation[0].queries, relation[0].indices[0]));
        } else {
          promises.push(Promise.resolve(''));
        }


        if (relation[1].queries instanceof Array && relation[1].queries.length > 0) {
          promises.push(explainQueries(relation[1].queries, relation[1].indices[0]));
        } else {
          promises.push(Promise.resolve(''));
        }

        return Promise.all(promises).then(function (explanations) {
          var html =
            '<b>' + (el.negate === true ? 'NOT ' : '' ) + 'Relation:</b></br>' +
            '<table class="relation">' +
            '<tr>' +
            '<td>from: <b>' + relation[0].indices[0] + '.' + relation[0].path + '</b>' +
            (explanations[0] ? '</br>' + explanations[0] : '') +
            '</td>' +
            '<td>to: <b>' + relation[1].indices[0] + '.' + relation[1].path + '</b>' +
            (explanations[1] ? '</br>' + explanations[1] : '') +
            '</td>' +
            '</tr></table>';

          return html;
        });
      };


      var explainGroup = function (el) {
        var group = el.group;

        var promises = [];
        _.each(group, function (sequence) {
          promises.push(explainJoinSequence(sequence));
        });

        return Promise.all(promises).then(function (groupSequenceExplanations) {
          var html =
            '<b>Group of relations:</b></br>' +
            '<table class="group">';
          _.each(groupSequenceExplanations, function (sequenceExplanation) {
            html += '<tr><td>' + sequenceExplanation + '</td></tr>';
          });
          return html + '</table>';
        });
      };


      var explainJoinSequence = function (join_sequence) {

        // clone and reverse to iterate backwards to show the last step on top
        var sequence = _.cloneDeep(join_sequence);
        sequence.reverse();

        var promises = [];
        _.each(sequence, function (el) {
          if (el.relation) {
            promises.push(explainRelation(el));
          } else if (el.group) {
            promises.push(explainGroup(el));
          }
        });

        return Promise.all(promises).then(function (sequenceElementExplanations) {
          var html = '<table class="sequence">';
          for (var i = 0; i < sequenceElementExplanations.length; i++) {
            html += '<tr' + (sequence[i].negate ? 'class="negated"' : '') + '><td>' + sequenceElementExplanations[i] + '</td></tr>';
          }
          return html + '</table>';
        });
      };


      var explainFiltersForJoinSet = function (indexId, filters) {
        var html = 'Index: <b>' + indexId + '</b></br>';
        if (!filters) {
          return Promise.resolve(html);
        }

        var promises = [];
        _.each(filters, function (filter) {
          promises.push(explainFilter(filter, indexId));
        });

        return Promise.all(promises).then(function (explanations) {
          html += '<ul>';
          _.each(explanations, function (expl) {
            html += '<li>' + expl + '</li>';
          });
          html += '</ul>';
          return html;
        });
      };


      var explainJoinSet = function (joinSet) {
        var promises = [];
        _.each(joinSet.queries, function (query, index) {
          promises.push(explainFiltersForJoinSet(index, query));
        });

        return Promise.all(promises).then(function (explanations) {
          var html = '<ul>';
          _.each(explanations, function (expl) {
            html += '<li>' + expl + '</li>';
          });
          return html + '</ul>';
        });
      };


      var getFilterExplanations = function (filters) {
        var promises = [];
        _.each(filters, function (f) {
          if (f.join_sequence) {
            promises.push(explainJoinSequence(f.join_sequence));
          } else if (f.join_set) {
            promises.push(explainJoinSet(f.join_set));
          } else {
            // for now push an empty explanation so array lenght is correct
            promises.push(Promise.resolve(''));
          }
        });

        return Promise.all(promises).then(function (results) {
          var filterExplanations = [];
          _.each(results, function (explanation) {
            filterExplanations.push(explanation);
          });
          return filterExplanations;
        });
      };


      return {
        getFilterExplanations: getFilterExplanations,
        initQtip: initQtip
      };
    })();

    return new JoinExplanationHelper();
  };
});
