import { QuickDashModalsProvider } from './quickdash_modals.js';
import { QuickDashMakeVisProvider } from './make_visualizations';
import { panelsLayout } from './panels_layout';

import { DashboardStateProvider } from 'plugins/kibana/dashboard/dashboard_state';
import { createDashboardEditUrl } from 'plugins/kibana/dashboard/dashboard_constants';

import _ from 'lodash';


// Local Functions

function lastReducer(regex, last, obj) {
  obj = obj._source || obj;
  const match = obj.title.match(regex);
  return match ? Math.max(last, +(match[1] || 1)) : last;
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
  const escTitle = _.escapeRegExp(title);
  const regex = new RegExp(`^${escTitle}(?: #([0-9]*))?$`);
  const reducer = lastReducer.bind(null, regex);

  return dashboards.reduce(reducer, 0);
}

function getLastQuickObjectNumber(savedObjects) {
  const reducer = lastReducer.bind(null, /\[Quick #([0-9]*)\]$/);

  return savedObjects.scanAll('Quick')
    .then(scan => scan.hits.reduce(reducer, 0));
}


// Exports

export function QuickDashboardProvider(
    Private, createNotifier, kbnUrl, AppState, kibiState, dashboardGroups,
    savedDashboardGroups, savedDashboards, savedSearches, savedVisualizations) {

  const DashboardState = Private(DashboardStateProvider);
  const makeSavedVisualizations = Private(QuickDashMakeVisProvider);
  const quickDashModals = Private(QuickDashModalsProvider);

  const notify = createNotifier({ location: 'Quick Dashboard' });


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

  function askUserSpecs(args) {
    const { defaultDashTitle, savedSearch } = args;

    return quickDashModals.create({ title: defaultDashTitle, savedSearch })
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

  function removeDashboardFromGroup(groupId, dashId) {
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
      .then(() => groupId && removeDashboardFromGroup(groupId, dashId));
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

        return quickDashModals.titleConflict(modalOptions)
          .then(action => {
            if(!action) { return Promise.reject(0); }

            switch(action) {
              case 'save':
                return;

              case 'overwrite':
                const groupId = quickEntry.group && quickEntry.group.id;
                return removeQuickDashboard(groupId, quickEntry.id);

              default:
                throw "Unexpected error - unknown title conflict action";
            }
          })
          .then(() => args);
      })
  }

  function makeQuickSpecs(args) {
    return Promise.all([
      getLastQuickObjectNumber(savedVisualizations),
      getLastQuickObjectNumber(savedSearches)
    ])
    .then(quickNums => {
      const quickNumber = Math.max(...quickNums) + 1;
      const quickSuffix = ` [Quick #${quickNumber}]`;

      args.quickSpecs = { quickSuffix, quickNumber };
      return args;
    });
  }

  function makeEmptyDashboard(args) {
    const { userSpecs, quickSpecs, savedSearch } = args;

    return savedDashboards.get('')
      .then(dash => {
        // Borrowing dashboardState from the dashboard app, but we
        // don't want its state changes to taint the discover app state,
        // so saveState() will be overridden

        const dashState = new DashboardState(dash, AppState);
        dashState.appState.timeRestore = false;
        dashState.saveState = () => {};

        dashState.setTitle(userSpecs.title);

        args.dashboard = dash;
        args.dashState = dashState;

        return args;
      });
  }

  function retrieveFields(args) {
    const { indexPattern } = args;
    const { timeFieldName } = indexPattern;

    let { fieldNames } = args;

    if(timeFieldName) {
      // The index's time field is always implicitly added. This is coherent with the
      // way the 'Discover' app shows data.
      fieldNames = fieldNames.concat([timeFieldName]);
    }

    args.fields = _(fieldNames)
      .map(fName => {
        // Non-aggregatable fields cannot be represented. In this case, they may have
        // a corresponding 'raw' or 'keyword' (not es-analyzed) field which *is*
        // aggregatable to be used instead.

        const candidates = [
          indexPattern.fields.byName[fName],
          indexPattern.fields.byName[fName + '.raw'],
          indexPattern.fields.byName[fName + '.keyword']
        ];

        return candidates.find(field => field && field.aggregatable);
      })
      .compact()
      .value();

    return args;
  }

  function makeVisualizations(args) {
    const { quickSpecs, indexPattern, fields } = args;

    return makeSavedVisualizations(indexPattern, fields)
      .then(savedVises => {
        savedVises.forEach(sVis => sVis.title += quickSpecs.quickSuffix);

        args.savedVises = savedVises;
      })
      .then(() => args);
  }

  function saveVisualizations(args) {
    const { savedVises } = args;

    return Promise.all(savedVises.map(sVis => sVis.save()))
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
    const { userSpecs, quickSpecs, savedSearch, dashboard } = args;

    switch(userSpecs.savedSearchAction) {
      case 'new':
        savedSearch.id = undefined;
        savedSearch.title = dashboard.title + quickSpecs.quickSuffix;
        // continue

      case 'save':
        return savedSearch.save()
          .then(id => {
            dashboard.savedSearchId = savedSearch.id;
            return args;
          });

      case 'none':
        return args;

      default:
        throw "Unexpected error - unknown saved search action";
    }
  }

  function saveDashboard(args) {
    const { quickSpecs, userSpecs, savedVises, dashboard, dashState, timeFilter } = args;

    dashState.appState.timeRestore = userSpecs.storeTimeWithDashboard;

    // Saving additional metadata to track quick dashboard (and components) after their
    // creation. This is typically useful to orchestrate overwrites/deletes of quick
    // dashboards.
    //
    // NOTE: uiState.set needs to be *silent*, or the appState changes get persisted...
    dashState.uiState.setSilent('quickState', {
      quickNumber: quickSpecs.quickNumber,

      addedSavedSearches:
        (userSpecs.savedSearchAction === 'new') ? [dashboard.savedSearchId] : [],

      addedSavedVises: _.map(savedVises, 'id')
    });

    // Saving the dashboard *MUST NOT* show a popup at this stage. We'll be simulating
    // a previous save.
    dashboard.lastSavedTitle = dashboard.title;


    let savedDashId = null;

    return dashState.saveDashboard(angular.toJson, timeFilter)
      .then(dashId => {
        // The calculated savedDashId should always be non-null
        if(!dashId) { throw "Unexpected error - couldn't create dashboard"; }

        savedDashId = dashId;
      })
      .then(() => dashboardGroups.computeGroups('Quick Dashboard added'))
      .then(() => dashboardGroups.updateMetadataOfDashboardIds([ savedDashId ], true))
      .then(() => args);
  }

  function applyFilters(args) {
    const { dashState, query, filters, timeFilter } = args;

    // Filters are applied by in the dashboard app state.
    dashState.applyFilters(query, filters);

    // Time filters, instead, are saved in the kibiState.
    kibiState._saveTimeForDashboardId(
      dashState.savedDashboard.id,
      timeFilter.time.mode, timeFilter.time.from, timeFilter.time.to);

    return args;
  }

  function openDashboardPage({ dashState }) {
    const dashId = dashState.savedDashboard.id;
    const appState = dashState.appState

    // Stores the appState in the localSession and returns a query param reference
    const appQueryParam = appState.toQueryParam(appState.toObject());

    // Opened dashboard will be in 'Edit' mode, supplying the created app state
    kbnUrl.change(createDashboardEditUrl(dashId) + `?_a=${appQueryParam}`);
  }


  // Exported Provider Functions

  function create(args) {
    args = Object.assign({
      dashboardEntries: flattenDashboardGroups(dashboardGroups)
    }, args);

    return Promise.resolve(args)
      .then(makeDefaultTitle)
      .then(askUserSpecs)
      .then(checkDuplicateTitle)
      .then(makeQuickSpecs)
      .then(makeEmptyDashboard)
      .then(retrieveFields)
      .then(makeVisualizations)
      .then(saveVisualizations)
      .then(fillDashboard)
      .then(saveSavedSearch)
      .then(saveDashboard)
      .then(applyFilters)
      .then(openDashboardPage)
      .catch(err => err && notify.error(err));
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

        const { quickNumber } = quickState;

        // Get the number of dashboards referencing the same quick components.
        // This is essentially required when quick dashes are cloned.
        return savedDashboards.scanAll()
          .then(allDashboards => {
            const refCount = allDashboards.hits.reduce((count, hit) => {
              const dash = hit._source;

              const currUiState = JSON.parse(dash.uiStateJSON);
              const currQuickState = currUiState.quickState;

              if(currQuickState && currQuickState.quickNumber === quickNumber) {
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

