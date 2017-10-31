import management from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_datasources/controllers/datasources_editor';
import './services/jdbc_datasources';

management.getSection('kibana').register('datasources', {
  display: 'Datasources',
  order: 11,
  url: '#/management/siren/datasources'
});
