import _ from 'lodash';
import { uiModules } from 'ui/modules';

uiModules
.get('templates_editor/services/saved_templates')
.factory('SavedTemplate', function (courier) {
  _.class(SavedTemplate).inherits(courier.SavedObject);

  function SavedTemplate(id) {
    courier.SavedObject.call(this, {
      type: SavedTemplate.type,
      mapping: SavedTemplate.mapping,
      searchSource: SavedTemplate.searchSource,

      id: id,

      defaults: {
        title: 'New Saved Template',
        description: '',
        templateSource: '',
        templateEngine: 'jade',
        version: 2
      }
    });
  }

  SavedTemplate.type = 'template';
  SavedTemplate.mapping = {
    title: 'string',
    description: 'string',
    templateSource: 'string',
    templateEngine: 'string',
    version: 'integer'
  };
  SavedTemplate.searchSource = true;

  return SavedTemplate;
});
