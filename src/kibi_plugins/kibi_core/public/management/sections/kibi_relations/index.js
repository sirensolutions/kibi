import management from 'ui/management';
import angular from 'angular';
import 'plugins/kibi_core/management/sections/kibi_relations/controllers/relations';

//settingsSectionRegistry.register(_.constant({
  //order: 10,
  //name: 'relations',
  //buttonLabel: 'Relations',
  //display: 'Relations',
  //url: '#/settings/relations',
  //isObjectValid: function () {
    //return angular.element(document.getElementById('relations')).scope().isObjectValid();
  //},
  //saveObject: function () {
    //angular.element(document.getElementById('relations')).scope().submit();
  //}
//}));

management.getSection('kibana').register('relations', {
  display: 'Relations',
  order: 10,
  url: '#/management/kibana/relations'
});
