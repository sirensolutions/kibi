define(function (require) {
  var _ = require('lodash');

  require('components/notify/notify');

  var module = require('modules').get('templates_editor/services/saved_templates', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedTemplate', function (courier) {
    _(SavedTemplate).inherits(courier.SavedObject);

    function SavedTemplate(id) {
      courier.SavedObject.call(this, {
        type: SavedTemplate.type,

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          st_templateSource: 'string',
          st_templateEngine: 'string',
          _previewQueryId: 'string', // used only to temporary store query id for preview
          version: 'long'
        },

        defaults: {
          title: 'New Saved Template',
          description: '',
          st_templateSource: '',
          st_templateEngine: 'handlebars',
          _previewQueryId: '',
          version: 1
        },

        searchSource: true
      });
    }

    SavedTemplate.type = 'template';

    return SavedTemplate;
  });
});
