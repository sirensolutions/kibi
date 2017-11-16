import { management } from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_relations/controllers/relations';
import 'plugins/kibi_core/management/sections/kibi_relations/advanced_options/advanced_options';

// kibi: We hide this section as it is replaced by the new Entities one.
// management.getSection('kibana').register('relations', {
//   display: 'Relations',
//   order: 10,
//   url: '#/management/siren/relations'
// });
