define(function (require) {

  var angular = require('angular');

  require('plugins/settings/sections/relations/controllers/relations');
  require('modules').get('apps/settings', ['monospaced.elastic']);

  return {
    name: 'relations',
    buttonLabel: 'Relation',
    display: 'Relations',
    url: '#/settings/relations'
  };
});
