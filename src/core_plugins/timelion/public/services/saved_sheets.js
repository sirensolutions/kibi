import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
// kibi: timelion-sheet saved object via savedObjectsAPI
import { CacheProvider } from 'ui/kibi/helpers/cache_helper';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';

define(function (require) {
  const module = require('ui/modules').get('app/sheet');
  // bring in the factory
  require('./_saved_sheet.js');

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  savedObjectManagementRegistry.register({
    service: 'savedSheets',
    title: 'sheets'
  });

  // This is the only thing that gets injected into controllers
  module.service('savedSheets', function (SavedSheet, kbnIndex, esAdmin, kbnUrl,
                                          savedObjectsAPI, savedObjectsAPITypes, Private) {
    // kibi: timelion-sheet is saved through the savedObjectsAPI
    savedObjectsAPITypes.add('timelion-sheet');

    const options = {
      caching: {
        find: true,
        get: true,
        cache: Private(CacheProvider)
      },
      savedObjectsAPI
    };
    const savedSheetLoader = new SavedObjectLoader(SavedSheet, kbnIndex, esAdmin, kbnUrl, options);
    savedSheetLoader.urlFor = function (id) {
      return kbnUrl.eval('#/{{id}}', { id: id });
    };

    savedSheetLoader.loaderProperties = {
      name: 'timelion-sheet',
      noun: 'Saved Sheets',
      nouns: 'saved sheets'
    };
    return savedSheetLoader;
  });
});
