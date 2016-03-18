define(function (require) {

  var angular = require('angular');

  require('plugins/kibana/settings/sections/kibi_relations/controllers/relations');
  require('plugins/kibana/settings/sections/kibi_relations/controllers/_view');
  require('ui/modules').get('apps/settings', ['monospaced.elastic']);

  return {
    name: 'relations',
    buttonLabel: 'Relation',
    display: 'Relations',
    url: '#/settings/relations'
  };
});
