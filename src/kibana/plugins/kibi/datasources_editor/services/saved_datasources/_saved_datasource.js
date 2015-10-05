define(function (require) {
  var _ = require('lodash');

  require('components/notify/notify');

  var module = require('modules').get('datasources_editor/services/saved_datasources', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedDatasource', function (courier, Private) {

    var setDatasourceSchema = Private(require('plugins/kibi/datasources_editor/lib/set_datasource_schema'));

    _(SavedDatasource).inherits(courier.SavedObject);

    function SavedDatasource(id) {
      courier.SavedObject.call(this, {
        type: SavedDatasource.type,

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          datasourceType: 'string',
          datasourceParams: 'json',
          version: 'long'
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
