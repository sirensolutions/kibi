require('brace');
require('brace/mode/json');
// kibi: added by kibi
require('brace/mode/jade');
require('brace/mode/handlebars');
require('brace/mode/sql');
require('src/ui/public/kibi/ace_modes/sparql');
// kibi: end
require('node_modules/@elastic/ui-ace/ui-ace');

require('ui/modules').get('kibana', ['ui.ace']);

module.exports = window.ace;
