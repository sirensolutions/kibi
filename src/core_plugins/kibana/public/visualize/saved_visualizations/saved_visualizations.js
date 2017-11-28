import 'plugins/kibana/visualize/saved_visualizations/_saved_vis';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';

const app = uiModules.get('app/visualize');

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedVisualizations',
  title: 'visualizations'
});

// kibi: savedObjectsAPI, $http is added
app.service('savedVisualizations', function (Promise, esAdmin, kbnIndex, SavedVis, Private, createNotifier, kbnUrl,
  $http, savedObjectsAPI) {
  const visTypes = Private(VisTypesRegistryProvider);
  const notify = createNotifier({
    location: 'Saved Visualization Service'
  });

  // kibi: 'savedObjectsAPI' is added
  const saveVisualizationLoader = new SavedObjectLoader(SavedVis, kbnIndex, esAdmin, kbnUrl, { savedObjectsAPI });
  saveVisualizationLoader.mapHits = function (hit) {
    const source = hit._source;
    source.id = hit._id;
    source.url = this.urlFor(hit._id);

    let typeName = source.typeName;
    if (source.visState) {
      try { typeName = JSON.parse(source.visState).type; }
      catch (e) { /* missing typename handled below */ } // eslint-disable-line no-empty
    }

    if (!typeName || !visTypes.byName[typeName]) {
      if (!typeName) notify.error('Visualization type is missing. Please add a type to this visualization.', source);
      else notify.error('Visualization type of "' + typeName + '" is invalid. Please change to a valid type.', source);
      return kbnUrl.redirect('/management/siren/objects/savedVisualizations/{{id}}', { id: source.id });
    }

    source.type = visTypes.byName[typeName];
    source.icon = source.type.icon;
    return source;
  };

  saveVisualizationLoader.urlFor = function (id) {
    return kbnUrl.eval('#/visualize/edit/{{id}}', { id: id });
  };
  return saveVisualizationLoader;
});
