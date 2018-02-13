import { QuickDashModalsProvider } from './quickdash_modals.js';
import { QuickDashMakeVisProvider } from './make_visualizations';
import { panelsLayout } from './panels_layout';

import { ProgressMapProvider } from 'ui/kibi/modals/progress_map';

import { DashboardStateProvider } from 'plugins/kibana/dashboard/dashboard_state';
import { createDashboardEditUrl } from 'plugins/kibana/dashboard/dashboard_constants';

import angular from 'angular';
import uuid from 'uuid';
import _ from 'lodash';


// Local Functions

function titleRoot(title) {
  const numRe = /( #[0-9]*)$/;

  const numMatch = title.match(numRe);
  if(numMatch) { title = title.slice(0, title.length - numMatch[1].length); }

  return title;
}

function lastReducer(title) {
  const escTitle = _.escapeRegExp(title);
  const regex = new RegExp(`^${escTitle}(?: #([0-9]*))?$`);

  return function (last, obj) {
    obj = obj._source || obj;
    const match = obj.title.match(regex);
    return match ? Math.max(last, +(match[1] || 1)) : last;
  };
}

function flattenDashboardGroups(dashboardGroups) {
  return _.reduce(dashboardGroups.getGroups(), (result, group) => {
    if(group.virtual) {
      result.push(group);
      return result;
    }

    if(!group.dashboards) { return result; }

    return result.concat(group.dashboards.map(dash => {
      dash = _.clone(dash);
      dash.group = group;

      return dash;
    }));
  }, []);
}

function getLastDashboardNumber(dashboards, title) {
  return title
    ? dashboards.reduce(lastReducer(title), 0)
    : Promise.resolve(0);
}

function getLastSavedSearchNumber(savedSearches, title) {
  if(!title) { return Promise.resolve(0); }

  const nonWordsRe = /\W/g;
  const onlyWordCharsTitle = title.replace(nonWordsRe, ' ');

  return savedSearches.scanAll(onlyWordCharsTitle)
    .then(scan => scan.hits.reduce(lastReducer(title), 0));
}


// Exports

export function QuickDashboardProvider(
    Private, createNotifier, kbnUrl, AppState, kibiState, dashboardGroups,
    savedDashboardGroups, savedDashboards, savedSearches, savedVisualizations) {

  const DashboardState = Private(DashboardStateProvider);
  const visMaker = Private(QuickDashMakeVisProvider);
  const quickDashModals = Private(QuickDashModalsProvider);
  const progressMap = Private(ProgressMapProvider);

  const notify = createNotifier({ location: 'Quick Dashboard' });


  function showExperimentalWarning(args) {
    return quickDashModals.experimentalWarning()
      .show()
      .then(ok => ok || Promise.reject(0))
      .then(() => args);
  }

  function makeDefaultTitle(args) {
    const { indexPattern, savedSearch, dashboardEntries } = args;

    let defaultDashTitle = savedSearch.id
      ? savedSearch.title
      : indexPattern.title;

    const dashNum = getLastDashboardNumber(dashboardEntries, defaultDashTitle);
    if(dashNum) { defaultDashTitle += ` #${dashNum + 1}`; }

    args.defaultDashTitle = defaultDashTitle;
    return args;
  }

  function toUniqueSearchTitle(title) {
    title = titleRoot(title);

    return getLastSavedSearchNumber(savedSearches, title)
      .then(num => num ? `${title} #${num + 1}` : title);
  }

  function askUserSpecs(args) {
    const { defaultDashTitle, savedSearch } = args;

    return quickDashModals.create({
      title: defaultDashTitle,
      currSearchTitle: savedSearch.id && savedSearch.title,
      toUniqueSearchTitle
    })
    .show()
    .then(userSpecs => {
      if(!userSpecs) { return Promise.reject(0); }    // Canceled

      args.userSpecs = userSpecs;
      return args;
    });
  }

  function findSingleQuickEntry(candidateDashes) {
    return Promise.all(candidateDashes.map(dash => savedDashboards.get(dash.id)))
      .then(dashes => candidateDashes.filter((entry, d) => {
        const uiState = JSON.parse(dashes[d].uiStateJSON);
        return !!uiState.quickState;
      }))
      .then(quickEntries => quickEntries.length === 1 && quickEntries[0])
      .catch(_.noop);
  }

  function checkDuplicateTitle(args) {
    const { dashboardEntries, userSpecs } = args;
    const { title } = userSpecs;

    const sameTitleEntries = dashboardEntries.filter(dash => dash.title === title);
    if(!sameTitleEntries.length) { return args; }

    return findSingleQuickEntry(sameTitleEntries)
      .then(quickEntry => {
        const modalOptions = { title, save: true };
        if(quickEntry) { modalOptions.overwrite = true; }

        const dupTitleSpecs = { quickEntry };

        return quickDashModals.titleConflict(modalOptions)
          .show()
          .then(action => {
            if(!action) { return Promise.reject(0); }

            dupTitleSpecs.conflictAction = action;

            switch(action) {
              case 'save':
              case 'overwrite':
                args.dupTitleSpecs = dupTitleSpecs;
                return args;

              default:
                throw "Unexpected error - unknown title conflict action";
            }
          });
      });
  }

  function retrieveFields(args) {
    const { indexPattern } = args;
    const { timeFieldName } = indexPattern;

    let { fieldNames } = args;

    if(timeFieldName && fieldNames.indexOf(timeFieldName) < 0) {
      // The index's time field is always implicitly added at the front.
      // This is coherent with the way the 'Discover' app shows data.
      fieldNames = [timeFieldName].concat(fieldNames);
    }

    args.fields = _(fieldNames)
      .map(fName => {
        const field = indexPattern.fields.byName[fName];
        if(!field || field.aggregatable) { return field; }

        // Non-aggregatable fields cannot be represented. In this case, they may have
        // an aggregatable among their multifields, to be used instead. Note that
        // we'll be getting the multifields straight from the index, the referenced
        // on from the parent field don't look complete.

        return _(field.multifields)
          .map(mfStandIn => indexPattern.fields.byName[mfStandIn.name])
          .find(mField => mField && mField.aggregatable);
      })
      .compact()
      .value();

    return args;
  }

  function makeFilteringQuery(args) {
    const { indexPattern, savedSearch, timeFilter, userSpecs } = args;

    return savedSearch.searchSource._flatten()
      .then(req => req.body.query)
      .then(query => {
        if(!userSpecs.storeTimeWithDashboard) {
          const { timeFieldName } = indexPattern;

          query.bool.must = _.filter(query.bool.must, clause =>
            !clause.range || !clause.range[timeFieldName]);
        }

        return query;
      })
      .then(query => {
        args.query = query;
        return args;
      });
  }


  function makeEmptyDashboard(args) {
    const { userSpecs } = args;

    return savedDashboards.get('')
      .then(dash => {
        // Borrowing dashState from the dashboard app, but we
        // don't want its state changes to taint the discover app state,
        // so saveState() will be overridden
        const dashState = new DashboardState(dash, AppState);
        dashState.saveState = _.noop;

        dashState.setTitle(userSpecs.title);
        dashState.appState.timeRestore = false;

        // Filters are copied from current, but they will be moved to the
        // assigned saved search - so they must be cleared on the dashState
        // to avoid duplication
        const query = { query_string: { analyze_wildcard: true, query: '*' } };
        const filters = [];

        dashState.appState.query = query;
        dashState.appState.filters = filters;
        dashState.applyFilters(query, filters);

        args.dashboard = dash;
        args.dashState = dashState;

        return args;
      });
  }

  function makeVisSteps(args) {
    const { userSpecs } = args;

    return visMaker.analysisStepsCount(args.indexPattern, args.fields, {
      addSirenMultiChart: userSpecs.addSirenMultiChart
    });
  }

  function makeVisualizations(args, progress) {
    const { indexPattern, fields, query, userSpecs } = args;

    return visMaker.makeSavedVisualizations(indexPattern, fields, {
      query,
      addSirenMultiChart: userSpecs.addSirenMultiChart,
      progress
    })
    .then(savedVises => {
      // Fields that couldn't be converted are retained, must be filtered out manually
      args.savedVises = _.filter(savedVises);

      return args;
    });
  }

  function saveVisualizations(args) {
    const { savedVises, savedSearch } = args;

    return Promise.all(savedVises.map(sVis => {
      // There *MUST NOT* be a 'duplicate title' popup at this stage.
      // We'll be simulating a previous save.
      sVis.lastSavedTitle = sVis.title;
      sVis.savedSearchId = savedSearch.id;

      return sVis.save();
    }))
    .then(() => args);
  }

  function fillDashboard(args) {
    const { dashState, savedVises } = args;

    const panels = dashState.getPanels();
    const panelSpecs = savedVises.map(sVis => ({ type: sVis.vis.type.name }));
    const layout = panelsLayout(panelSpecs);

    layout.forEach(pGeom => {
      const sVis = savedVises[pGeom.index];

      dashState.addNewPanel(sVis.id, 'visualization');
      const panel = panels[panels.length - 1];

      panel.col = pGeom.x + 1;
      panel.row = pGeom.y + 1;
      panel.size_x = pGeom.width;
      panel.size_y = pGeom.height;
    });

    return args;
  }

  function saveSavedSearch(args) {
    const { userSpecs, savedSearch, dashboard } = args;

    switch(userSpecs.savedSearchAction) {
      case 'new':
        savedSearch.id = undefined;
        savedSearch.title = userSpecs.newSavedSearchTitle;

        // There *MUST NOT* be a 'duplicate title' popup at this stage.
        // We'll be simulating a previous save.
        savedSearch.lastSavedTitle = savedSearch.title;

        // continue

      case 'save':
        return savedSearch.save()
          .then(id => {
            dashboard.savedSearchId = savedSearch.id;
            return args;
          });

      case 'nosave':
        dashboard.savedSearchId = savedSearch.id;
        return args;

      default:
        throw "Unexpected error - unknown saved search action";
    }
  }

  function saveDashboard(args) {
    const { userSpecs, savedVises, dashboard, dashState, timeFilter } = args;

    dashState.appState.timeRestore = userSpecs.storeTimeWithDashboard;

    // Saving additional metadata to track quick dashboard (and components) after their
    // creation. This is typically useful to orchestrate overwrites/deletes of quick
    // dashboards.
    //
    // NOTE: uiState.set needs to be *silent*, or the appState changes get persisted...
    dashState.uiState.setSilent('quickState', {
      quickId: uuid.v4(),

      addedSavedSearches:
        (userSpecs.savedSearchAction === 'new') ? [dashboard.savedSearchId] : [],

      addedSavedVises: _.map(savedVises, 'id')
    });

    // There *MUST NOT* be a 'duplicate title' popup at this stage.
    // We'll be simulating a previous save.
    dashboard.lastSavedTitle = dashboard.title;


    let savedDashId = null;

    return dashState.saveDashboard(angular.toJson, timeFilter)
      .then(dashId => {
        // The calculated savedDashId should always be non-null
        if(!dashId) { throw "Unexpected error - couldn't create dashboard"; }

        savedDashId = dashId;
      })
      .then(() => dashboardGroups.computeGroups('Quick Dashboard added'))
      .then(groups => dashboardGroups.updateMetadataOfDashboardIds(_(groups)
        .filter(group => !group.collapsed || group.virtual)
        .map('dashboards')
        .flatten()
        .map('id')
        .value()))
      .then(() => args);
  }

  function removeDashboardFromInMemoryGroup(groupId, dashId) {
    let arr = dashboardGroups.getGroups();
    if(groupId) { arr = arr.find(group => group.id === groupId); }

    if(!arr) { return; }

    _.remove(arr, dash => dash.id === dashId);
  }

  function removeDashboardFromGroup(groupId, dashId) {
    removeDashboardFromInMemoryGroup(groupId, dashId);
    if(!groupId) { return; }

    return savedDashboardGroups.get(groupId)
      .then(group => {
        group.dashboards = group.dashboards.filter(dash => dash.id !== dashId);
        return group.save();
      });
  }

  function removeQuickDashboard(groupId, dashId) {
    return Promise.resolve()
      .then(() => releaseQuickComponents(dashId))
      .then(() => savedDashboards.delete(dashId))
      .then(() => removeDashboardFromGroup(groupId, dashId));
  }

  function removeDupDashboard(args) {
    const { dupTitleSpecs } = args;

    if(!dupTitleSpecs || dupTitleSpecs.conflictAction !== 'overwrite') {
      return args;
    }

    const { quickEntry } = dupTitleSpecs;
    const groupId = quickEntry.group && quickEntry.group.id;
    const dashId = quickEntry.id;

    return removeQuickDashboard(groupId, dashId)
      .then(() => args);
  }

  function applyTimeFilter(args) {
    const { dashState, timeFilter } = args;

    // Time filter will be retained. It's saved in the kibiState.
    kibiState._saveTimeForDashboardId(
      dashState.savedDashboard.id,
      timeFilter.time.mode, timeFilter.time.from, timeFilter.time.to);

    return args;
  }

  function openDashboardPage({ dashState }) {
    const dashId = dashState.savedDashboard.id;

    // Opened dashboard will be in 'View' mode
    const appState = dashState.appState;
    appState.viewMode = 'view';

    // Stores the appState in the localSession and returns a query param reference
    const appQueryParam = appState.toQueryParam(appState.toObject());

    // Change url, supplying the created app state
    kbnUrl.change(createDashboardEditUrl(dashId) + `?_a=${appQueryParam}`);
  }

  function undoSaves(args) {
    const { userSpecs, dashboard, savedSearch, savedVises } = args;

    let promises = [];

    if(dashboard && dashboard.id) {
      promises.push(savedDashboards.delete(dashboard.id));

      // New dashboards figure as 'virtual' groups. They are not really
      // saved in savedDashboardGroups, so we just have to remove the entry from
      // the dashboardGroups array.
      removeDashboardFromInMemoryGroup(null, dashboard.id);
    }

    if(userSpecs && userSpecs.savedSearchAction === 'new' && savedSearch.id) {
      promises.push(savedSearches.delete(savedSearch.id));
    }

    promises = promises.concat(_(savedVises || [])
      .map('id')
      .compact()
      .map(visId => savedVisualizations.delete(visId))
      .value());

    return Promise.all(promises)
      .catch(notify.error);
  }


  // Exported Provider Functions

  function create(args) {
    args = Object.assign({
      dashboardEntries: flattenDashboardGroups(dashboardGroups)
    }, args);

    return Promise.resolve(args)
      .then(showExperimentalWarning)
      .then(makeDefaultTitle)
      .then(askUserSpecs)
      .then(checkDuplicateTitle)
      .then(retrieveFields)
      .then(makeFilteringQuery)
      .then(() => progressMap([
        { fn: makeEmptyDashboard, text: 'Making new Dashboard' },
        { fn: makeVisualizations, countFn: makeVisSteps },
        { fn: saveSavedSearch,    text: 'Saving Saved Search' },
        { fn: saveVisualizations, text: 'Saving Visualizations' },
        { fn: fillDashboard,      text: 'Compiling Dashboard' },
        { fn: saveDashboard,      text: 'Saving Dashboard' }
      ], {
        title: 'Populating Dashboard...',
        valueMap: (op, o, progress) => op.fn(args, progress),
        stepMap: op => op.text || op.countFn(args)
      }).then(() => args))
      .then(removeDupDashboard)
      .then(applyTimeFilter)
      .then(openDashboardPage)
      .catch(err => undoSaves(args)
        .then(() => { err && notify.error(err); }));
  }

  function releaseQuickComponents(dashId) {
    // Quick dashboards make a lot of associated visualizations and
    // saved searches that should be destroyed together with the dashboard.
    //
    // This function removes all this associated content if no other (cloned)
    // quick dashboard owns them.

    return savedDashboards.get(dashId)
      .then(savedDash => {
        const uiState = JSON.parse(savedDash.uiStateJSON);

        const { quickState } = uiState;
        if(!quickState) { return; }

        const { quickId } = quickState;

        // Get the number of dashboards referencing the same quick components.
        // This is essentially required when quick dashes are cloned.
        return savedDashboards.scanAll()
          .then(allDashboards => {
            const refCount = allDashboards.hits.reduce((count, hit) => {
              const dash = hit._source;

              const currUiState = JSON.parse(dash.uiStateJSON);
              const currQuickState = currUiState.quickState;

              if(currQuickState && currQuickState.quickId === quickId) {
                ++count;
              }

              return count;
            }, 0);

            if(refCount <= 1) {
              // Remove quick components
              return Promise.all([
                savedSearches.delete(quickState.addedSavedSearches),
                savedVisualizations.delete(quickState.addedSavedVises)
              ]);
            }
          });
      })
      .catch(_.noop);

      // Ignore errors - at most, quick components will not be deleted
  }

  return {
    create, releaseQuickComponents
  };
}

