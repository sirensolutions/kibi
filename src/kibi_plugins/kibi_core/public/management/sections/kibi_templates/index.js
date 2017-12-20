import { management } from 'ui/management';
import 'plugins/investigate_core/management/sections/kibi_templates/controllers/templates_editor';

management.getSection('kibana').register('templates', {
  display: 'Templates',
  order: 13,
  url: '#/management/siren/templates'
});
