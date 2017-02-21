import _ from 'lodash';
import SetDatasourceSchemaProvider from '../lib/set_datasource_schema';
import uiModules from 'ui/modules';

uiModules
.get('kibi_datasources/services/saved_datasources')
.factory('SavedDatasource', function (courier, Private) {
  const setDatasourceSchema = Private(SetDatasourceSchemaProvider);

  _.class(SavedDatasource).inherits(courier.SavedObject);
  function SavedDatasource(id) {
    // Gives our SavedDatasource the properties of a SavedObject
    SavedDatasource.Super.call(this, {
      type: SavedDatasource.type,
      mapping: SavedDatasource.mapping,
      searchSource: SavedDatasource.searchsource,
      init: SavedDatasource.init,

      // if this is null/undefined then the SavedObject will be assigned the defaults
      id: id,

      // default values that will get assigned if the doc is new
      defaults: {
        title: 'New Saved Datasource',
        description: '',
        datasourceType: '',
        datasourceParams: '{}',
        version: 1
      },

      // if an indexPattern was saved with the searchsource of a SavedDatasource
      // object, clear it. It was a mistake
      clearSavedIndexPattern: true
    });
  }

  // save these objects with the 'datasource' type
  SavedDatasource.type = 'datasource';

  // if type:datasource has no mapping, we push this mapping into ES
  SavedDatasource.mapping = {
    title: 'string',
    description: 'string',
    datasourceType: 'string',
    datasourceParams: 'json',
    version: 'integer'
  };

  SavedDatasource.searchsource = true;

  SavedDatasource.init = function () {
    // do the custom init to populate datasourceDef property
    setDatasourceSchema(this);

    if (typeof this.datasourceParams === 'string' || this.datasourceParams instanceof String) {
      try {
        this.datasourceParams = JSON.parse(this.datasourceParams);
      } catch (e) {
        throw new Error('Could not parse datasourceParams json for ' + this.id + ' datasource');
      }
    }
  };

  return SavedDatasource;
});
