import _ from 'lodash';
import settingsSectionRegistry from 'ui/registry/settings_sections';
import uiModules from 'ui/modules';
import 'plugins/kibana/settings/sections/kibi_relations/controllers/relations';

uiModules.get('apps/settings', ['monospaced.elastic']);

settingsSectionRegistry.register(_.constant({
  order: 10,
  name: 'relations',
  buttonLabel: 'Relation',
  display: 'Relations',
  url: '#/settings/relations'
}));
