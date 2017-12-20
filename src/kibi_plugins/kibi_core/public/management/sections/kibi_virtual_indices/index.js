import { management } from 'ui/management';
import 'plugins/investigate_core/management/sections/kibi_virtual_indices/controllers/virtual_indices_controller';

management.getSection('kibana').register('virtualindices', {
  display: 'Virtual Indices',
  order: 1,
  url: '#/management/siren/virtualindices'
});
