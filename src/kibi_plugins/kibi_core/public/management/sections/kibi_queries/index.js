import management from 'ui/management';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedQueriesRegister from 'plugins/kibi_core/management/sections/kibi_queries/services/saved_query_register';
import 'plugins/kibi_core/management/sections/kibi_queries/controllers/queries_editor';

savedObjectRegistry.register(savedQueriesRegister);

//settingsSectionRegistry.register(_.constant({
  //order: 12,
  //name: 'queries',
  //buttonLabel: 'Query',
  //display: 'Queries',
  //url: '#/settings/queries',
  //openObjectFinder: function () {
    //angular.element(document.getElementById('queries_editor')).scope().openQueryFinder();
  //},
  //newObject: function () {
    //angular.element(document.getElementById('queries_editor')).scope().newQuery();
  //},
  //saveObject: function () {
    //angular.element(document.getElementById('queries_editor')).scope().submit();
  //}
//}));

management.getSection('kibana').register('queries', {
  display: 'Queries',
  order: 12,
  url: '#/management/kibana/queries'
});
