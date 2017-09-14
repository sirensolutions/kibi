import { management } from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_datasources/controllers/datasources_editor';

management.getSection('kibana').register('datasources', {
  display: 'Datasources',
  order: 11,
  url: '#/management/siren/datasources'
});
