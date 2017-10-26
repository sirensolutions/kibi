import { management } from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_entities/controllers/entities';

management.getSection('kibana').register('entities', {
  display: 'Entities',
  order: 12,
  url: '#/management/siren/entities'
});
