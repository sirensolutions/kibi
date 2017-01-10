import angular from 'angular';
import _ from 'lodash';
import uiModules from 'ui/modules';

uiModules
.get('ui/kibi/helpers/kibi_session_helper/services/saved_sessions', [])
.factory('SavedSession', function (courier) {
  _.class(SavedSession).inherits(courier.SavedObject);

  function SavedSession(id) {

    SavedSession.Super.call(this, {
      id: id,
      type: SavedSession.type,
      mapping: SavedSession.mapping,
      defaults: {
        title: 'New Session',
        description: '',
        session_data: {},
        version: 1,
        timeCreated: undefined,
        timeUpdated: undefined
      }
    });
  }

  SavedSession.type = 'session';

  SavedSession.mapping = {
    title: 'string',
    description: 'string',
    session_data: 'json',
    version: 'integer',
    timeCreated: 'date',
    timeUpdated: 'date'
  };

  return SavedSession;
});
