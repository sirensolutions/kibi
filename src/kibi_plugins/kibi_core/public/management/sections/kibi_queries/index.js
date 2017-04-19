import management from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_queries/controllers/queries_editor';

management.getSection('kibana').register('queries', {
  display: 'Queries',
  order: 12,
  url: '#/management/siren/queries'
});
