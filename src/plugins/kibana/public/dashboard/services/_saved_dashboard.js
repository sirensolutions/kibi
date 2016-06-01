define(function (require) {
  var module = require('ui/modules').get('app/dashboard');
  var angular = require('angular');
  var _ = require('lodash');
  var moment = require('moment');

  // Used only by the savedDashboards service, usually no reason to change this
  module.factory('SavedDashboard', function (courier, config) {
    // SavedDashboard constructor. Usually you'd interact with an instance of this.
    // ID is option, without it one will be generated on save.
    _.class(SavedDashboard).inherits(courier.SavedObject);
    function SavedDashboard(id) {
      // Gives our SavedDashboard the properties of a SavedObject
      SavedDashboard.Super.call(this, {
        type: SavedDashboard.type,
        mapping: SavedDashboard.mapping,
        searchSource: SavedDashboard.searchsource,

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id: id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: 'New Dashboard',
          hits: 0,
          description: '',
          panelsJSON: '[]',
          optionsJSON: angular.toJson({
            darkTheme: config.get('dashboard:defaultDarkTheme')
          }),
          uiStateJSON: '{}',
          version: 1,
          timeRestore: false,
          timeMode: undefined,
          timeTo: undefined,
          timeFrom: undefined,
          savedSearchId: undefined // kibi: added to be able to store savedSearchId
          // TODO: investigate that instead we could use optionsJSON for it
          // https://github.com/sirensolutions/kibi-private/issues/67
        },

        // if an indexPattern was saved with the searchsource of a SavedDashboard
        // object, clear it. It was a mistake
        clearSavedIndexPattern: true
      });
    }

    // save these objects with the 'dashboard' type
    SavedDashboard.type = 'dashboard';

    // if type:dashboard has no mapping, we push this mapping into ES
    SavedDashboard.mapping = {
      title: 'string',
      hits: 'integer',
      description: 'string',
      panelsJSON: 'string',
      optionsJSON: 'string',
      uiStateJSON: 'string',
      version: 'integer',
      timeRestore: 'boolean',
      timeMode: 'string',
      timeTo: 'string',
      timeFrom: 'string',
      savedSearchId: 'string'
    };

    SavedDashboard.searchsource = true;

    return SavedDashboard;
  });
});
