define(function (require) {
  var _ = require('lodash');

  require('ui/notify');

  var module = require('ui/modules').get('templates_editor/services/saved_templates', [
    'kibana/notify',
    'kibana/courier'
  ]);

  module.factory('SavedTemplate', function (courier) {
    _.class(SavedTemplate).inherits(courier.SavedObject);

    function SavedTemplate(id) {
      courier.SavedObject.call(this, {
        type: SavedTemplate.type,

        id: id,

        mapping: {
          title: 'string',
          description: 'string',
          templateSource: 'string',
          templateEngine: 'string',
          version: 'integer'
        },

        defaults: {
          title: 'New Saved Template',
          description: '',
          templateSource: '',
          templateEngine: 'jade',
          version: 1
        },

        searchSource: true
      });
    }

    SavedTemplate.type = 'template';

    return SavedTemplate;
  });
});
