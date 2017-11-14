/*eslint no-use-before-define: 1*/
import jQuery from 'jquery';
import _ from 'lodash';
import fieldFormatProvider from 'ui/registry/field_formats';
import 'kibi-qtip2';
import uiModules from 'ui/modules';

uiModules
.get('app/dashboard')
.service('joinExplanation', ($timeout, Private, indexPatterns, Promise, kibiState) => {
  const fieldFormat = Private(fieldFormatProvider);

  /**
   * Format the value as a date if the field type is date
   */
  function formatDate(fields, fieldName, value) {
    const field = _.find(fields, function (field) {
      return field.name === fieldName;
    });
    if (field && field.type === 'date') {
      let format = field.format;
      if (!format) {
        format = fieldFormat.getDefaultInstance('date');
      }
      return format.convert(value, 'html');
    }
    return value;
  }

  function formatMatch(f, matchType) {
    const match = Object.keys(f[matchType])[0];
    const matchQuery = f[matchType][match];

    if (matchQuery.constructor === Object) {
      return ' match on ' + match + ': <b>' + matchQuery.query + '</b> ';
    } else {
      return ' match on ' + match + ': <b>' + matchQuery + '</b> ';
    }
  }

  const initQtip = function (explanations) {
    jQuery('.qtip-join').qtip('destroy', true);
    $timeout(function () {

      jQuery('.filter').each(function (index) {
        const $el = jQuery(this);
        if ($el.hasClass('join') && explanations[index]) {
          $el.qtip('destroy', true);
          $el.qtip({
            content: {
              title: 'Steps - last one on top',
              text: explanations[index]
            },
            position: {
              my: 'top left',
              at: 'bottom center'
            },
            style: {
              classes: 'qtip-join qtip-light qtip-rounded qtip-shadow'
            }
          });
        }
      });
    });
    return Promise.resolve('done');
  };

  const createFilterLabel = function (f, fields) {
    let prop;
    let lowerBound;
    let upperBound;
    let lowerBoundDescriptor;
    let upperBoundDescriptor;

    if (f.query_string && f.query_string.query) {
      return Promise.resolve(' query: <b>' + f.query_string.query + '</b> ');
    } else if (f.terms) {
      const fieldName = Object.keys(f.terms)[0];
      return Promise.resolve(` any on ${fieldName}: <b>${f.terms[fieldName].join(', ')}</b> `);
    } else if (f.match) {
      return Promise.resolve(formatMatch(f, 'match'));
    } else if (f.match_phrase) {
      return Promise.resolve(formatMatch(f, 'match_phrase'));
    } else if (f.match_phrase_prefix) {
      return Promise.resolve(formatMatch(f, 'match_phrase_prefix'));
    } else if (f.range) {
      prop = Object.keys(f.range)[0];
      lowerBound = _.has(f.range[prop], 'gte') ? f.range[prop].gte : f.range[prop].gt;
      upperBound = _.has(f.range[prop], 'lte') ? f.range[prop].lte : f.range[prop].lt;
      lowerBoundDescriptor = _.has(f.range[prop], 'gte') ? 'inclusive' : 'exclusive';
      upperBoundDescriptor = _.has(f.range[prop], 'lte') ? 'inclusive' : 'exclusive';
      return Promise.resolve(' ' + prop + ': <b>' + formatDate(fields, prop, lowerBound) +
        '</b> (' + lowerBoundDescriptor + ') to <b>' + formatDate(fields, prop, upperBound) +
        '</b> (' + upperBoundDescriptor + ') ');
    } else if (f.dbfilter) {
      return Promise.resolve(' ' + (f.dbfilter.negate ? 'NOT' : '') + ' dbfilter: <b>' + f.dbfilter.queryid + '</b> ');
    } else if (f.or) {
      return Promise.resolve(' or filter <b>' + f.or.length + ' terms</b> ');
    } else if (f.exists) {
      return Promise.resolve(' exists: <b>' + f.exists.field + '</b> ');
    } else if (f.script) {
      return Promise.resolve(' script: script:<b>' + f.script.script + '</b> params: <b>' + f.script.params + '</b> ');
    } else if (f.missing) {
      return Promise.resolve(' missing: <b>' + f.missing.field + '</b> ');
    } else if (f.not) {
      return createFilterLabel(f.not, fields).then(function (html) {
        return ' NOT' + html;
      });
    } else if (f.geo_bounding_box) {
      prop = Object.keys(f.geo_bounding_box)[0];
      return Promise.resolve(' ' + prop + ': <b>' + JSON.stringify(f.geo_bounding_box[prop].top_left, null, '') + '</b> to <b>'
        + JSON.stringify(f.geo_bounding_box[prop].bottom_right, null, '') + '</b> ');
    } else if (f.join_sequence) {
      return explainJoinSequence(f.join_sequence).then(function (html) {
        return 'join_sequence: ' + html;
      });
    } else if (f.query) {
      return createFilterLabel(f.query);
    } else {
      return Promise.resolve(' <font color="red">Unable to pretty print the filter:</font> ' +
        JSON.stringify(_.omit(f, '$$hashKey'), null, ' ') + ' ');
    }
  };

  const explainFilter = function (filter, indexId) {
    if (filter.range || filter.not) {
      // fields might be needed
      return indexPatterns.get(indexId).then(function (index) {
        return createFilterLabel(filter, index.fields);
      });
    } else {
      return Promise.resolve(createFilterLabel(filter));
    }
  };

  const explainFilterInMustNot = function (filter, indexId) {
    return explainFilter(filter, indexId).then(function (filterExplanation) {
      return 'NOT ' + filterExplanation;
    });
  };

  const explainQueries = function (queries, indexId) {

    const promises = [];
    _.each(queries, function (query) {
      // in our case we have filtered query for now
      if (query.query && query.query.bool && query.query.bool.must) {
        let queryStrings = query.query.bool.must;
        if (!(query.query.bool.must instanceof Array)) {
          queryStrings = [ query.query.bool.must ];
        }
        _.each(queryStrings, (queryString) => {
          // only if the query is different than star query
          if (!_.has(queryString, 'query_string.query') || _.get(queryString, 'query_string.query') !== '*') {
            promises.push(explainFilter(queryString, indexId));
          }
        });
      }

      if (query.query && query.query.bool && query.query.bool.filter && query.query.bool.filter.bool) {
        const must = query.query.bool.filter.bool.must;
        const mustNot = query.query.bool.must_not;
        if (must instanceof Array && must.length > 0) {
          _.each(must, function (filter) {
            promises.push(explainFilter(filter, indexId));
          });
        }
        if (mustNot instanceof Array && mustNot.length > 0) {
          _.each(mustNot, function (filter) {
            promises.push(explainFilterInMustNot(filter, indexId));
          });
        }
      }

      if (query.query_string && query.query_string.query) {
        promises.push(explainFilter(query, indexId));
      }
    });

    return Promise.all(promises).then(function (filterExplanations) {
      let html = '<ul>';
      _.each(filterExplanations, function (explanation) {
        html += '<li>' + explanation + '</li>';
      });
      return html + '</ul>';
    });
  };

  const explainRelation = function (el) {
    const relation = el.relation;

    const promises = [];
    if (relation[0].queries instanceof Array && relation[0].queries.length > 0) {
      promises.push(explainQueries(relation[0].queries, relation[0].pattern));
    } else {
      promises.push(Promise.resolve(''));
    }


    if (relation[1].queries instanceof Array && relation[1].queries.length > 0) {
      promises.push(explainQueries(relation[1].queries, relation[1].pattern));
    } else {
      promises.push(Promise.resolve(''));
    }

    return Promise.all(promises).then(function (explanations) {
      const html =
        '<b>' + (el.negate === true ? 'NOT ' : '') + 'Relation:</b></br>' +
        '<table class="relation">' +
        '<tr>' +
        '<td>from: <b>' + JSON.stringify(relation[0].indices, null, ' ') + '.' + relation[0].path + '</b>' +
        (explanations[0] ? '</br>' + explanations[0] : '') +
        '</td>' +
        '<td>to: <b>' + JSON.stringify(relation[1].indices, null, ' ') + '.' + relation[1].path + '</b>' +
        (explanations[1] ? '</br>' + explanations[1] : '') +
        '</td>' +
        '</tr></table>';

      return html;
    });
  };

  const explainJoinSequence = function (joinSequence, isPruned) {
    // clone and reverse to iterate backwards to show the last step on top
    const sequence = _.cloneDeep(joinSequence);
    sequence.reverse();

    const promises = [];
    _.each(sequence, function (el, i) {
      if (el.relation) {
        promises.push(explainRelation(el));
      } else if (el.group) {
        promises.push(explainGroup(el));
      }
    });

    return Promise.all(promises).then(function (sequenceElementExplanations) {
      let html = '<table class="sequence">';
      for (let i = 0; i < sequenceElementExplanations.length; i++) {
        html += '<tr' + (sequence[i].negate ? 'class="negated"' : '') + '><td>' + sequenceElementExplanations[i] + '</td></tr>';
      }

      if (isPruned) {
        html += '<tr><td><b>Notice:</b> This is a sample of the results because join operation was pruned</td></tr>';
      }
      return html + '</table>';
    });
  };

  const explainGroup = function (el) {
    const group = el.group;

    const promises = [];
    _.each(group, function (sequence, i) {
      promises.push(explainJoinSequence(sequence));
    });

    return Promise.all(promises).then(function (groupSequenceExplanations) {
      let html =
        '<b>Group of relations:</b></br>' +
        '<table class="group">';
      _.each(groupSequenceExplanations, function (sequenceExplanation) {
        html += '<tr><td>' + sequenceExplanation + '</td></tr>';
      });
      return html + '</table>';
    });
  };

  const getFilterExplanations = function (filters) {
    const promises = [];
    _.each(filters, function (f) {
      if (f.join_sequence) {
        if (f.meta && f.meta.isPruned) {
          promises.push(explainJoinSequence(f.join_sequence, f.meta.isPruned));
        } else {
          promises.push(explainJoinSequence(f.join_sequence));
        }
      } else {
        promises.push(explainFilter(f));
      }
    });

    return Promise.all(promises).then(function (results) {
      const filterExplanations = [];
      _.each(results, function (explanation) {
        filterExplanations.push(explanation);
      });

      return filterExplanations;
    });
  };

  const _constructFilterIconMessage = function (filters, queries) {
    if (queries || filters) {
      const nFilters = _.reject(filters, 'meta.fromSavedSearch').length;
      const hasQuery = !kibiState._isDefaultQuery(queries[0]);

      if (hasQuery && nFilters) {
        const promises = [];
        promises.push(explainQueries(queries));
        promises.push(getFilterExplanations(filters));
        return Promise.all(promises)
          .then(([queryExplanation, filterExplanation]) => Promise.resolve(`\n${queryExplanation}\n${filterExplanation}`));
      } else if (hasQuery) {
        return explainQueries(queries)
          .then(queryExplanation => Promise.resolve(`\n${queryExplanation}`));
      } else if (nFilters) {
        return getFilterExplanations(filters)
          .then(filterExplanations => {
            let html = '<ul>';
            _.each(filterExplanations, function (explanation) {
              html += '<li>' + explanation + '</li>';
            });
            return Promise.resolve(html + '</ul>');
          });
      }
    }
    return Promise.resolve(null);
  };

  return {
    constructFilterIconMessage: _constructFilterIconMessage,
    getFilterExplanations,
    createFilterLabel,
    initQtip: initQtip
  };
});
