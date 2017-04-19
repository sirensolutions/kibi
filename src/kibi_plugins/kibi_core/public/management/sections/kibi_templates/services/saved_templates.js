import 'plugins/kibi_core/management/sections/kibi_templates/services/_saved_template';
import uiModules from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import CacheProvider from 'ui/kibi/helpers/cache_helper';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedTemplatesRegister from 'plugins/kibi_core/management/sections/kibi_templates/services/saved_templates_register';

savedObjectRegistry.register(savedTemplatesRegister);

// Register this service with the saved object registry so it can be edited by the object editor.
require('plugins/kibana/management/saved_object_registry').register({
  service: 'savedTemplates',
  title: 'templates'
});

// This is the only thing that gets injected into controllers
uiModules
.get('templates_editor/services/saved_templates')
.service('savedTemplates', function (savedObjectsAPI, Private, SavedTemplate, kbnIndex, esAdmin, kbnUrl) {
  const options = {
    caching: {
      find: true,
      get: true,
      cache: Private(CacheProvider)
    },
    savedObjectsAPI
  };
  const savedTemplateLoader = new SavedObjectLoader(SavedTemplate, kbnIndex, esAdmin, kbnUrl, options);

  savedTemplateLoader.urlFor = function (id) {
    return kbnUrl.eval('#/management/siren/templates/{{id}}', { id: id });
  };

  return savedTemplateLoader;
});
