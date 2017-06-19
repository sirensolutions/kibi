import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
// kibi: timelion-sheet saved object via savedObjectsAPI
import CacheProvider from 'ui/kibi/helpers/cache_helper';

define(function (require) {
  const module = require('ui/modules').get('app/sheet');
  // bring in the factory
  require('./_saved_sheet.js');

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/management/saved_object_registry').register({
    service: 'savedSheets',
    title: 'sheets'
  });

  // This is the only thing that gets injected into controllers
  module.service('savedSheets', function (savedObjectsAPI, savedObjectsAPITypes, Private, SavedSheet,
                                          kbnIndex, esAdmin, kbnUrl) {
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
