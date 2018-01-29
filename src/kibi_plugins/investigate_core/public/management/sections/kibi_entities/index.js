import { management } from 'ui/management';
import 'plugins/investigate_core/management/sections/kibi_entities/controllers/entities';

management.getSection('kibana').register('entities', {
  display: 'Indexes and Relations',
  order: 3,
  url: '#/management/siren/indexesandrelations'
});
