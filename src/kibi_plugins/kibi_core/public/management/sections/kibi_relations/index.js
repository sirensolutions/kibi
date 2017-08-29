import { management } from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_relations/controllers/relations';

management.getSection('kibana').register('relations', {
  display: 'Relations',
  order: 10,
  url: '#/management/siren/relations'
});
