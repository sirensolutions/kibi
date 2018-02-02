import * as visTypes from './vistypes';
import { QuickDashModalsProvider } from './quickdash_modals';
import { ProgressMapProvider } from './progress_map';
import { promiseMapSeries, fieldSpec, queryIsAnalyzed } from './commons';
import { QuickDashMakeVisProvider } from './make_visualizations';

import _ from 'lodash';


function composeScores(tests) {
  // Individual ranking scores will be combined to a power-weighted product.
  //
  // Using products lets a score be compensated by its inverse, whereas using sums
  // compensating a high score would require a negative score, which is somewhat weird.
  //
  // We also prefer to avoid correcting for the number of tests (ie averaging) since
  // the number of tests is small, and we want the resulting overall score to be
  // correctible at a later stage (akin to adding tests inline).
  //
  // Note furthermore that scoring a 0 in some test will result in the field being
  // filtered out of the results.

  return tests.reduce((result, test) =>
    result * Math.pow(test.score, test.weight), 1);
}


export function GuessFieldsProvider(
  Private, createNotifier, ontologyClient, mappings, es) {

  const visMaker = Private(QuickDashMakeVisProvider);
  const progressMap = Private(ProgressMapProvider);
  const quickDashModals = Private(QuickDashModalsProvider);

  const notify = createNotifier({ location: 'Guess Fields' });


  // Filtering

  function markMultifields(args) {
    // Input fields may be multifields - that is, alternate representations of some
    // parent fields. Find out those whose parent is already in the supplied fields list.

    const multifieldNames = _.chain(args.workStats)
      .map(fieldStats => fieldStats.field.multifields)
      .flatten()
      .map('name')
      .indexBy()
      .value();

    args.workStats.forEach(fieldStats => {
      fieldStats.multifield = !!multifieldNames[fieldStats.field.name];
    });
  }

  function markAcceptableFields(args) {
    markMultifields(args);

    args.workStats.forEach(fieldStats => {
      const { field } = fieldStats;
      const notesLen = fieldStats.notes.length;

      if(!field.searchable) { fieldStats.notes.push('Not searchable'); }
      if(!field.aggregatable) { fieldStats.notes.push('Not aggregatable'); }
      if(field.scripted) { fieldStats.notes.push('Scripted'); }
      if(fieldStats.multifield) { fieldStats.notes.push('Multifield'); }

      fieldStats.acceptable = (fieldStats.notes.length === notesLen);
    });
  }


  // Queries

  function queryRelated(args) {
    const { index } = args;

    return ontologyClient.getRelationsByDomain(index.id)
      .then(relations => {
        const domainFields = _.indexBy(relations, rel => rel.domain.field);

        args.workStats.forEach(fieldStats => {
          fieldStats.related = !!domainFields[fieldStats.field.name];
        });
      });
  }

  function querySamplesAndDocsCount(index, field) {
    const { timeFieldName } = index;

    const request = {
      index: index.id,
      ignore_unavailable: true,
      body: {
        size: 50,
        query: {
          bool: {
            must: [{ exists: fieldSpec(field) }],
            must_not: []
          }
        }
      },
    };

    if(timeFieldName) {
      // Values not associated to time are never displayed in charts
      const timeField = index.fields.byName[timeFieldName];
      request.body.query.bool.must.push({ exists: fieldSpec(timeField) });
    }

    if(field.type === 'string') {
      // No empty strings
      request.body.query.bool.must_not.push({ term: { [field.name]: '' } });
    }

    return es.search(request)
      .then(resp => ({
        docsCount: resp.hits.total,
        samples: _.map(resp.hits.hits, '_source')
      }));
  }

  function queryUniquesCount(index, field) {
    const request = {
      index: index.id,
      ignore_unavailable: true,
      body: {
        size: 0,
        aggs: {
          result: {
            cardinality: _.assign({
              precision_threshold: 20
            }, fieldSpec(field))
          }
        }
      }
    };

    return es.search(request)
      .then(resp => resp.aggregations.result.value);
  }

  function querySavedVis(index, field) {
    return visMaker.makeSavedVisualizations(index, [ field ], {
      addSirenDataTable: false,
      addSirenMultiChart: false
    })
    .then(savedVises => savedVises[0]);
  }

  function queryDataType(index, field) {
    const { type } = field;
    if(type !== 'string') { return type; }

    return queryIsAnalyzed(mappings, index, field)
      .then(analyzed => analyzed ? 'text' : 'keyword');
  }


  // Ranking Helpers

  function makeHasDuplicate(args) {
    // String fields can sometimes be imported from a datasource both as keyword and
    // text types, but *not* as multi-field. This tries to identify these duplicate
    // string field cases.

    function searchDupsFor(fieldType, searchType) {
      const searchFields = _(args.workStats)
        .filter(fieldStats => fieldStats.dataType === searchType)
        .map('field')
        .value();

      args.workStats.forEach(fieldStats => {
        if(fieldStats.dataType !== fieldType) { return; }

        const { field } = fieldStats;
        const candidateSearchDups = _.indexBy(searchFields, 'name');

        // NOTE: Not using lodash chaining with forEach due to subtle chainable change
        // between lodash v3 and v4

        fieldStats.samples.forEach(sample => {
          const fieldValue = sample[field.name];

          searchFields
            .filter(sField => sample[sField.name] !== fieldValue)
            .forEach(sField => delete candidateSearchDups[sField.name]);
        });

        fieldStats.hasDuplicate = !_.isEmpty(candidateSearchDups);
      });
    }

    searchDupsFor('text', 'keyword');
    searchDupsFor('keyword', 'text');
  }


  // Ranking Functions

  function scoreName(fieldStats) {
    // Discriminate suspect field names, such as those starting with underscores
    return fieldStats.field.name.startsWith('_') ? 0.2 : 1;
  }

  function scoreDocsCount(fieldStats) {
    // Fields with more non-empty documents should score higher

    return (fieldStats.docsCount <= 1)
      ? 0 : (1 + Math.log(fieldStats.docsCount));
  }

  function scoreUniquesCount(fieldStats) {
    if(fieldStats.uniquesCount <= 1) {
      fieldStats.notes.push('Field has only one term');
      return 0;
    }

    return 1;
  }

  function scoreGeneratedVis(fieldStats) {
    if(!fieldStats.sVis) {
      fieldStats.notes.push('No suitable visualization');
      return 0;
    }

    // TODO: Add a 'scores' parameter to the visualizations generation function,
    // that it can use to report the vis's desirability, on its own merits.
    //
    // Use linear interpolation between vis score tiers to incorporate that number.

    switch(fieldStats.sVis.vis.type.name) {
      case visTypes.LINE:
      case visTypes.TILE_MAP:
        return 4;

      case visTypes.PIE:
      case visTypes.HISTOGRAM:
      case visTypes.TAGCLOUD:
        return 3;

      case visTypes.TABLE:
        return 1;

      default:
        fieldStats.notes.push('No score for associated visualization');
        return 0;
    }
  }

  function scoreUnusualSamples(fieldStats) {
    // Fields with unusual values should score lower

    switch(fieldStats.dataType) {
      case 'text':
        // Full-text fields with many digits tend to be harder to read

        const fieldName = fieldStats.field.name;
        const notDigitsRe = /\D/;

        const sumLengths = _.sum(fieldStats.samples, sample => sample[fieldName].length);
        if(!sumLengths) { return 1; }

        const sumDigitCounts = _.sum(fieldStats.samples,
          sample => sample[fieldName].replace(notDigitsRe, '').length);

        const digitsRatio = sumDigitCounts / sumLengths;

        return (1 - digitsRatio) * 1 + digitsRatio * 0.5;

      default:
        return 1;
    }
  }

  function scoreStringTermsAdequacy(fieldStats) {
    // In case of a string field with duplicate, we have to choose which field we prefer;
    // for fields whose terms are generally multi-word, we prefer the text one,
    // for single-words we'll take the keyword one.
    //
    // The discarded duplicate field will be filtered out.

    // TODO: Use terms aggregation rather than samples

    if(!fieldStats.hasDuplicate) { return 1; }

    const fieldName = fieldStats.field.name;
    const nonWordRe = /\W+/;

    const avgWordCounts =
      _.sum(fieldStats.samples, sample =>
        sample[fieldName].split(nonWordRe).filter(_.identity).length)
      / fieldStats.samples.length;

    const duplicateNote = 'Duplicate string field';
    const wordsBoundary = 5;

    switch(fieldStats.dataType) {
      case 'text':
        if(avgWordCounts < wordsBoundary) {
          fieldStats.notes.push(duplicateNote);
          return 0;
        }

      case 'keyword':
        if(avgWordCounts >= wordsBoundary) {
          fieldStats.notes.push(duplicateNote);
          return 0;
        }
    }

    return 1;
  }

  function scoreRelation(fieldStats) {
    if(!fieldStats.related) { return 1; }

    fieldStats.notes.push('Relation endpoint');
    return 1.5;
  }

  const scoreFunctions = [
    { weight: 1, fn: scoreName },
    { weight: 1, fn: scoreDocsCount },
    { weight: 1, fn: scoreUniquesCount },
    { weight: 1, fn: scoreGeneratedVis },
    { weight: 1, fn: scoreUnusualSamples },
    { weight: 1, fn: scoreStringTermsAdequacy },
    { weight: 1, fn: scoreRelation },
  ];


  // Reporting

  function prepareStatsForReporting(args) {
    args.stats.forEach(fieldStats => {
      fieldStats.scoreStr = '' + _.round(fieldStats.score, 3);

      fieldStats.typeField = _.clone(fieldStats.field);
      fieldStats.typeField.name = '';

      if(fieldStats.dataType === 'text') { fieldStats.notes.push('Analyzed'); }
    });

    args.stats = _.sortByAll(args.stats,
      fieldStats => -fieldStats.acceptable,
      fieldStats => fieldStats.dataType || fieldStats.field.type,
      fieldStats => -fieldStats.score,
      fieldStats => fieldStats.field.displayName);

    return args;
  }


  // Main Algorithm

  function filterAcceptableFields(args) {
    markAcceptableFields(args);
    args.workStats = _.filter(args.workStats, 'acceptable');

    return args;
  }

  function makeQueries(args) {
    const { index, workStats } = args;

    const fieldQueryFunctions = [
      querySamplesAndDocsCount,
      queryUniquesCount,
      querySavedVis,
      queryDataType
    ];

    function fieldTextMap(fieldStats) {
      return `Testing "${fieldStats.field.displayName}"`;
    }

    function fieldValueMap(fieldStats, progress) {
      const { field } = fieldStats;

      return promiseMapSeries(fieldQueryFunctions, fn => fn(index, field, progress))
        .then(([ { docsCount, samples }, uniquesCount, sVis, dataType ]) => {
          _.assign(fieldStats, { docsCount, uniquesCount, sVis, samples, dataType });
        });
    }

    const operations = [{
      val: args,
      textMap: _.constant('Querying index pattern'),
      valueMap: queryRelated
    }].concat(workStats.map(fieldStats => ({
      val: fieldStats,
      textMap: fieldTextMap,
      valueMap: fieldValueMap
    })));

    return progressMap(operations, {
      title: 'Autoselect Top 10',
      textMap: (op, o, progress) => op.textMap(op.val, progress),
      valueMap: (op, o, progress) => op.valueMap(op.val, progress)
    })
    .then(() => args);
  }

  function makeScoreHelpers(args) {
    makeHasDuplicate(args);
    return args;
  }

  function makeScores(args) {
    // Associate multiple scores to fields through several scoring functions,
    // result will be a composition of all scores.

    const { workStats } = args;
    if(!workStats.length) { return args; }

    workStats.forEach(fieldStats => {
      fieldStats.individualScores = scoreFunctions.map(
        ({ weight, fn }) => ({ weight, score: fn(fieldStats, args) }));

      fieldStats.score = composeScores(fieldStats.individualScores);
    });

    return args;
  }

  function sortAndPruneByScore(args) {
    args.workStats = _(args.workStats)
      .filter('score')
      .sortBy('score')
      .reverse()
      .value();

    return args;
  }

  function interleaveByDatatype(args) {
    // This function will interleave the array of ranked fields sorted by dataType,
    // under the constraint that candidate fields for interleaving must have
    // a score at least half that of current field.

    if(!args.interleaveByDatatype) { return args; }

    const { workStats } = args;
    if(!workStats.length) { return args; }

    const groupsHash = _.groupBy(workStats, fieldStats => fieldStats.field.type);
    const groups = _.values(groupsHash);

    args.groupsHash = groupsHash;

    const result = [];

    let currG = groups.indexOf(groupsHash[workStats[0].field.type]) - 1;
    let currScore = -1;

    let nextG = currG;
    let nextGroup = null;
    let nextScore = currScore;

    while(result.length !== workStats.length) {               // Must process all fields
      do {                                                    // Cycle groups from current
        nextG = (nextG + 1) % groups.length;
        nextGroup = groups[nextG];
        nextScore = nextGroup[0].score;
      } while(                                                // Pick first ok candidate
        nextG !== currG &&
        2 * nextScore < currScore
      );

      result.push(nextGroup.shift());                         // Pull & output group head

      if(!nextGroup.length) {                                 // Drop group if empty
        _.pullAt(groups, nextG);
        nextG = (nextG + groups.length - 1) % groups.length;
      }

      currG = nextG;                                          // Update iterators
      currScore = nextScore;
    }

    args.workStats = result;
    return args;
  }

  function makeSelection(args) {
    _.chain(args.workStats)
      .take(10)
      .forEach(fieldStats => { fieldStats.selected = true; })
      .commit();

    return args;
  }

  function showReport(args) {
    if(!args.showReport) { return args; }

    prepareStatsForReporting(args);

    return quickDashModals.guessReport({ stats: args.stats })
      .show()
      .then(() => args);
  }

  function toResult(args) {
    return _(args.workStats)
      .filter('selected')
      .map('field')
      .value();
  }


  return function guessFields(index, fields, options = {}) {
    _.defaults(options, {
      takeCount: 10,
      interleaveByDatatype: true,
      showReport: true
    });

    const args = _.assign({
      index,
      stats: fields.map(field => ({
        field,
        score: 0,
        notes: []
      }))
    }, options);

    // A working stats list will be filtered as needed to prevent running scores over
    // inappropriate fields. Field stats objects will remain the same, so changes to
    // work stats will be reported to the output stats list, too.
    args.workStats = args.stats;

    return Promise.resolve(args)
      .then(filterAcceptableFields)
      .then(makeQueries)
      .then(makeScoreHelpers)
      .then(makeScores)
      .then(sortAndPruneByScore)
      .then(interleaveByDatatype)
      .then(makeSelection)
      .then(showReport)
      .then(toResult)
      .catch(err => { err && notify.error(err); });
  };
}
