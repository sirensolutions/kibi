define(function (require) {
  var _ = require('lodash');

  require('ui/notify');

  var module = require('ui/modules').get('kibi_datasources/services/saved_datasources', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedDatasource', function (Private, courier) {

    var setDatasourceSchema = Private(require('plugins/kibana/settings/sections/kibi_datasources/lib/set_datasource_schema'));

    _.class(SavedDatasource).inherits(courier.SavedObject);

    function SavedDatasource(id) {
      courier.SavedObject.call(this, {
        type: SavedDatasource.type,

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          datasourceType: 'string',
          datasourceParams: 'json',
          version: 'integer'
        },

        defaults: {
          title: 'New Saved Datasource',
          description: '',
          datasourceType: '',
          datasourceParams: '{}',
          version: 1
        },

        searchSource: true,

        init: function () {
          // do the custom init to populate datasourceDef property
          setDatasourceSchema(this);

          if (typeof this.datasourceParams === 'string' || this.datasourceParams instanceof String) {
            try {
              this.datasourceParams = JSON.parse(this.datasourceParams);
            } catch (e) {
              throw new Error('Could not parse datasourceParams json for ' + this.id + ' datasource');
            }
          }
        }
      });
    }

    SavedDatasource.type = 'datasource';


    return SavedDatasource;
  });
});
