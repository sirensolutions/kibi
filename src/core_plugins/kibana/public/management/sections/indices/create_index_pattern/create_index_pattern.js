import _ from 'lodash';
import angular from 'angular';
import { IndexPatternMissingIndices, NoAccessToFieldStats } from 'ui/errors';
import 'ui/directives/validate_index_name';
import 'ui/directives/auto_select_if_only_one';
// kibi: removed RefreshKibanaIndex as in Kibi refresh is done by saved object API
// kibi: removed import of the create_index_template
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { getDefaultPatternForInterval } from './get_default_pattern_for_interval';
import { sendCreateIndexPatternRequest } from './send_create_index_pattern_request';
import { pickCreateButtonText } from './pick_create_button_text';
// kibi: imported IndexPatternAuthorizationError
import { IndexPatternAuthorizationError } from 'ui/errors';
// kibi: removed route '/management/kibana/index'

uiModules.get('apps/management')
.controller('managementIndicesCreate', function ($scope, $routeParams, kbnUrl, Private, Notifier, indexPatterns,
  es, config, Promise, $translate, ontologyClient, confirmModal, savedSearches, courier) {
  const notify = new Notifier();
  // kibi: removed RefreshKibanaIndex as in Kibi refresh is done by saved object API
  const intervals = indexPatterns.intervals;
  let loadingCount = 0;

  // Configure the new index pattern we're going to create.
  this.formValues = {
    name: config.get('indexPattern:placeholder'),
    classLabel: config.get('indexPattern:placeholder'),
    nameIsPattern: false,
    expandWildcard: false,
    nameInterval: _.find(intervals, { name: 'daily' }),
    timeFieldOption: null,
    excludeIndices: true
  };

  // UI state.
  this.timeFieldOptions = [];
  this.timeFieldOptionsError = null;
  this.sampleCount = 5;
  this.samples = null;
  this.existing = null;
  this.nameIntervalOptions = intervals;
  this.patternErrors = [];

  this.showAdvancedOptions = false;

  // fills index-pattern name based on query param.
  if ($routeParams.indexPatternName) {
    this.formValues.name = $routeParams.indexPatternName;
    this.formValues.classLabel = $routeParams.indexPatternName;
  }

  // fills index-pattern ID based on query param.
  if ($routeParams.id) {
    this.formValues.id = decodeURIComponent($routeParams.id);
    this.formValues.name = '';

    this.showAdvancedOptions = true;
  }

  const getTimeFieldOptions = () => {
    loadingCount += 1;
    return Promise.resolve()
    .then(() => {
      const { nameIsPattern, name } = this.formValues;

      if (!name) {
        return [];
      }

      if (nameIsPattern) {
        return indexPatterns.fieldsFetcher.fetchForTimePattern(name);
      }

      return indexPatterns.fieldsFetcher.fetchForWildcard(name);
    })
    .then(fields => {
      const dateFields = fields.filter(field => field.type === 'date');

      if (dateFields.length === 0) {
        return {
          options: [
            {
              display: `The indices which match this index pattern don't contain any time fields.`
            }
          ]
        };
      }

      return {
        options: [
          {
            display: `I don't want to use the Time Filter`
          },
          ...dateFields.map(field => ({
            display: field.name,
            fieldName: field.name
          })),
        ]
      };
    })
    .catch(err => {
      if (err instanceof IndexPatternMissingIndices) {
        return {
          error: 'Unable to fetch mapping. Do you have indices matching the pattern?'
        };
      // kibi: added
      } else if (err instanceof NoAccessToFieldStats) {
        return {
          error: 'You have no permission to fetch field stats for this index pattern.'
        };
      }
      // kibi: end
      throw err;
    })
    .finally(() => {
      loadingCount -= 1;
    });
  };

  const findTimeFieldOption = match => {
    if (!match) return;

    return this.timeFieldOptions.find(option => (
      // comparison is not done with _.isEqual() because options get a unique
      // `$$hashKey` tag attached to them by ng-repeat
      option.fieldName === match.fieldName &&
        option.display === match.display
    ));
  };

  const pickDefaultTimeFieldOption = () => {
    const noOptions = this.timeFieldOptions.length === 0;
    // options that represent a time field
    const fieldOptions = this.timeFieldOptions.filter(option => !!option.fieldName);
    // options like "I don't want the time filter" or "There are no date fields"
    const nonFieldOptions = this.timeFieldOptions.filter(option => !option.fieldName);
    // if there are multiple field or non-field options then we can't select a default, the user must choose
    const tooManyOptions = fieldOptions.length > 1 || nonFieldOptions.length > 1;

    if (noOptions || tooManyOptions) {
      return null;
    }

    if (fieldOptions.length === 1) {
      return fieldOptions[0];
    }

    return nonFieldOptions[0];
  };

  const resetIndex = () => {
    this.patternErrors = [];
    this.samples = null;
    this.existing = null;
  };

  const updateSamples = () => {
    const patternErrors = [];

    if (!this.formValues.nameInterval || !this.formValues.name) {
      return Promise.resolve();
    }

    loadingCount += 1;
    return indexPatterns.fieldsFetcher.testTimePattern(this.formValues.name)
      .then(existing => {
        const all = _.get(existing, 'all', []);
        const matches = _.get(existing, 'matches', []);

        if (all.length) {
          return this.existing = {
            all,
            matches,
            matchPercent: Math.round((matches.length / all.length) * 100) + '%',
            failures: _.difference(all, matches)
          };
        }

        patternErrors.push('Pattern does not match any existing indices');
        const radius = Math.round(this.sampleCount / 2);
        const samples = intervals.toIndexList(this.formValues.name, this.formValues.nameInterval, -radius, radius);

        if (_.uniq(samples).length !== samples.length) {
          patternErrors.push('Invalid pattern, interval does not create unique index names');
        } else {
          this.samples = samples;
        }

        throw patternErrors;
      })
      .finally(() => {
        loadingCount -= 1;
      });
  };

  this.isTimeBased = () => {
    if (!this.formValues.timeFieldOption) {
      // if they haven't choosen a time field, assume they will
      return true;
    }

    // if timeFieldOption has a fieldName it's a time field, otherwise
    // it's a way to opt-out of the time field or an indication that there
    // are no fields available
    return Boolean(this.formValues.timeFieldOption.fieldName);
  };

  this.canEnableExpandWildcard = () => {
    return (
      this.isTimeBased() &&
        !this.isCrossClusterName() &&
        !this.formValues.nameIsPattern &&
        _.includes(this.formValues.name, '*')
    );
  };

  this.isExpandWildcardEnabled = () => {
    return (
      this.canEnableExpandWildcard() &&
        !!this.formValues.expandWildcard
    );
  };

  this.canUseTimePattern = () => {
    return (
      this.isTimeBased() &&
        !this.isExpandWildcardEnabled() &&
        !this.isCrossClusterName()
    );
  };

  this.isCrossClusterName = () => {
    return (
      this.formValues.name &&
        this.formValues.name.includes(':')
    );
  };

  this.isLoading = () => {
    return loadingCount > 0;
  };

  let activeRefreshTimeFieldOptionsCall;
  this.refreshTimeFieldOptions = () => {
    // if there is an active refreshTimeFieldOptions() call then we use
    // their prevOption, allowing the previous selection to persist
    // across simultaneous calls to refreshTimeFieldOptions()
    const prevOption = activeRefreshTimeFieldOptionsCall
      ? activeRefreshTimeFieldOptionsCall.prevOption
      : this.formValues.timeFieldOption;

    // `thisCall` is our unique "token" to verify that we are still the
    // most recent call. When we are not the most recent call we don't
    // modify the controller in any way to prevent race conditions
    const thisCall = activeRefreshTimeFieldOptionsCall = { prevOption };

    loadingCount += 1;
    this.timeFieldOptions = [];
    this.timeFieldOptionsError = null;
    this.formValues.timeFieldOption = null;
    getTimeFieldOptions()
      .then(({ options, error }) => {
        if (thisCall !== activeRefreshTimeFieldOptionsCall) return;

        this.timeFieldOptions = options;
        this.timeFieldOptionsError = error;
        if (!this.timeFieldOptions) {
          return;
        }

        // Restore the preivously selected state, or select the default option in the UI
        const restoredOption = findTimeFieldOption(prevOption);
        const defaultOption = pickDefaultTimeFieldOption();
        this.formValues.timeFieldOption = restoredOption || defaultOption;
      })
      .catch(notify.error)
      .finally(() => {
        loadingCount -= 1;
        if (thisCall === activeRefreshTimeFieldOptionsCall) {
          activeRefreshTimeFieldOptionsCall = null;
        }
      });
  };

  this.toggleAdvancedIndexOptions = () => {
    this.showAdvancedOptions = !!!this.showAdvancedOptions;
  };

  this.changeClassLabel = () => {
    this.formValues.classLabel = this.formValues.name;
  };

  this.createIndexPattern = () => {
    const {
      name,
      timeFieldOption,
      nameIsPattern,
      nameInterval,
      // kibi: added following new properties
      classLabel,
      shortDescription,
      longDescription,
      icon,
      color,
      excludeIndices
    } = this.formValues;

    const id = name;

    const timeFieldName = timeFieldOption
      ? timeFieldOption.fieldName
      : undefined;

    const notExpandable = this.isExpandWildcardEnabled()
      ? undefined
      : true;

    // Only event-time-based index patterns set an intervalName.
    const intervalName = (this.canUseTimePattern() && nameIsPattern && nameInterval)
      ? nameInterval.name
      : undefined;

    loadingCount += 1;
    sendCreateIndexPatternRequest(indexPatterns, {
      id,
      name,
      timeFieldName,
      intervalName,
      notExpandable,
      excludeIndices
    }).then(createdId => {
      if (!createdId) {
        return;
      }

      // kibi: removed RefreshKibanaIndex as in Kibi refresh is done by saved object API
      // kibi: do not try to set the default index pattern automatically
      // as user might not have permissions to do it

      indexPatterns.cache.clear(id);

      // kibi: added entity creation in the ontology model
      return ontologyClient.insertEntity(id, classLabel, 'INDEX_PATTERN', icon, color, shortDescription, longDescription,
        null, null)
      .then(() => {
        $scope.createSavedSearchModal(id, classLabel);
        // force loading while kbnUrl.change takes effect
        loadingCount = Infinity;
      });
    }).catch(err => {
      if (err instanceof IndexPatternMissingIndices) {
        return notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
      }

      notify.fatal(err);
    }).finally(() => {
      loadingCount -= 1;
    });
  };

  // kibi: if user confirm modal for creating saved search, run this function
  $scope.createSavedSearchModal = function (indexPatternId, classLabel) {
    return savedSearches.find()
    .then(savedSearchObjs => {
      const savedSearch = _.find(savedSearchObjs.hits, 'title', classLabel);
      if (savedSearch) {
        const searchSource = angular.fromJson(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
        if (searchSource.index === indexPatternId) {
          const confirmModalOptions = {
            title: 'Success!',
            confirmButtonText: 'Yes, Go to Discovery',
            cancelButtonText: 'No, will do later',
            onConfirm: () => kbnUrl.change(`/discover/${savedSearch.id}/`),
            onCancel: () => kbnUrl.change(`/management/siren/indexesandrelations/${indexPatternId}`),
            messageAsHtml: true
          };
          confirmModal(
            '<p>The index pattern <i>' + indexPatternId + '</i>  was created. <br/> I have morover created a <b>core Saved search</b>' +
            ' (<i>' + classLabel + '</i> ). Do you want to go to Discovery and give a first look at it? <br/><br/> <b>Note</b>: you will ' +
            ' have to return here later if you want to set relationships between this index pattern and other datasets</p>',
            confirmModalOptions
          );
        } else {
          const confirmModalOptions = {
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            onConfirm: () => {
              return savedSearches.delete(savedSearch.id)
              .then($scope.createSavedSearch(indexPatternId, classLabel))
              .catch(err => err.notify);
            },
            onCancel: () => kbnUrl.change(`/management/siren/indexesandrelations/${indexPatternId}`),
            messageAsHtml: true
          };
          confirmModal(
            '<p>Warning, there already exists a saved search named <b>' + classLabel + '</b> which is NOT based on index pattern <b>' +
            indexPatternId + '</b> Should i overwrite the existing?<br><br> <b>Important:</b> If you do not overwrite now you will have ' +
            'to later manually associate a default saved search to this index pattern </p>',
            confirmModalOptions
          );
        }
      } else {
        $scope.createSavedSearch(indexPatternId, classLabel);
      }
    });
  };

  $scope.createSavedSearch = function (indexPatternId, classLabel) {
    const indexPatternPromise = courier.indexPatterns.get(indexPatternId);
    const savedSearchPromise = savedSearches.get();

    return Promise.all([indexPatternPromise, savedSearchPromise])
    .then(responses => {
      const indexPattern = responses[0];
      const savedSearch = responses[1];

      savedSearch.columns = ['_source'];
      savedSearch.searchSource
        .set('index', indexPattern)
        .highlightAll(true)
        .version(true)
        .size(config.get('discover:sampleSize'))
        .sort([indexPattern.timeFieldName, 'desc'])
        .query(null);
      savedSearch.title = classLabel;
      return savedSearch.save()
      .then(function (id) {
        const confirmModalOptions = {
          title: 'Success!',
          confirmButtonText: 'Yes, Go to Discovery',
          cancelButtonText: 'No, will do later',
          onConfirm: () => kbnUrl.change(`/discover/${id}`),
          onCancel: () =>  kbnUrl.change(`/management/siren/indexesandrelations/${indexPattern}`),
          messageAsHtml: true
        };
        confirmModal(
          '<p>The index pattern <i>' + indexPatternId + '</i>  was created. <br/> I have morover created a <b>core Saved search</b>' +
          ' (<i>' + classLabel + '</i> ). Do you want to go to Discovery and give a first look at it? <br/><br/> <b>Note</b>: you will ' +
          ' have to return here later if you want to set relationships between this index pattern and other datasets</p>',
          confirmModalOptions
        );
      })
      .catch(notify.error);
    });
  };
  // kibi: end

  $scope.$watchMulti([
    'controller.formValues.nameIsPattern',
    'controller.formValues.nameInterval.name',
  ], (newVal, oldVal) => {
    const nameIsPattern = newVal[0];
    const newDefault = getDefaultPatternForInterval(newVal[1]);
    const oldDefault = getDefaultPatternForInterval(oldVal[1]);

    if (this.formValues.name === oldDefault) {
      this.formValues.name = newDefault;
    }

    if (!nameIsPattern) {
      delete this.formValues.nameInterval;
    } else {
      this.formValues.nameInterval = this.formValues.nameInterval || intervals.byName.days;
      this.formValues.name = this.formValues.name || getDefaultPatternForInterval(this.formValues.nameInterval);
    }
  });

  this.moreSamples = andUpdate => {
    this.sampleCount += 5;
    if (andUpdate) updateSamples();
  };

  let latestUpdateSampleId = -1;
  $scope.$watchMulti([
    'controller.formValues.name',
    'controller.formValues.nameInterval'
  ], () => {
    resetIndex();

    // track the latestUpdateSampleId at the time we started
    // so that we can avoid mutating the controller if the
    // watcher triggers again before we finish (which would
    // cause latestUpdateSampleId to increment and the
    // id === latestUpdateSampleId checks below to fail)
    const id = (++latestUpdateSampleId);
    updateSamples()
      .then(() => {
        if (latestUpdateSampleId === id) {
          this.samples = null;
          this.patternErrors = [];
        }
      })
      .catch(errors => {
        if (latestUpdateSampleId === id) {
          this.existing = null;
          this.patternErrors = errors;
        }
      })
      .finally(() => {
        this.refreshTimeFieldOptions();
      });
  });

  $scope.$watchMulti([
    'controller.sampleCount'
  ], () => {
    this.refreshTimeFieldOptions();
  });

  $scope.$watchMulti([
    'controller.isLoading()',
    'form.name.$error.indexNameInput',
    'controller.formValues.timeFieldOption'
  ], ([loading, invalidIndexName, timeFieldOption]) => {
    const state = { loading, invalidIndexName, timeFieldOption };
    this.createButtonText = pickCreateButtonText($translate, state);
  });
});
