import _ from 'lodash';
import processFunctionDefinition from './server/lib/process_function_definition';
// kibi: register timelion-sheets with the saved_objects_api plugin
import timelionConfiguration from './server/lib/saved_objects/timelion-sheet';

module.exports = function (server) {
  server.plugins.saved_objects_api.registerType(timelionConfiguration);

  require('./server/routes/run.js')(server);
  require('./server/routes/functions.js')(server);
  require('./server/routes/validate_es.js')(server);

  const functions = require('./server/lib/load_functions')('series_functions');

  function addFunction(func) {
    _.assign(functions, processFunctionDefinition(func));
  }

  function getFunction(name) {
    if (!functions[name]) throw new Error ('No such function: ' + name);
    return functions[name];
  }

  server.plugins.timelion = {
    functions: functions,
    addFunction: addFunction,
    getFunction: getFunction
  };


};
