import management from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_templates/controllers/templates_editor';

management.getSection('kibana').register('templates', {
  display: 'Query Templates',
  order: 13,
  url: '#/management/siren/templates'
});
