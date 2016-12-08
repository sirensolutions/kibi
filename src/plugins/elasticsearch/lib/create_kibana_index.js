const SetupError = require('./setup_error');
module.exports = function (server) {
  const client = server.plugins.elasticsearch.client;
  const index = server.config().get('kibana.index');

  function handleError(message) {
    return function (err) {
      throw new SetupError(server, message, err);
    };
  }

  // kibi: we're defining an explicit mapping on version to avoid conflicts occurring when a plugin loads saved objects from JSON (which
  // would create an implicit mapping of `version` to long).
  return client.indices.create({
    index: index,
    body: {
      settings: {
        number_of_shards: 1
      },
      mappings: {
        _default_: {
          properties: {
            version: {
              type: 'integer'
            }
          }
        },
        config: {
          properties: {
            buildNum: {
              type: 'string',
              index: 'not_analyzed'
            }
          }
        }
      }
    }
  })
  .catch(handleError('Unable to create Kibana index "<%= kibana.index %>"'))
  .then(function () {
    return client.cluster.health({
      waitForStatus: 'yellow',
      index: index
    })
    .catch(handleError('Waiting for Kibana index "<%= kibana.index %>" to come online failed.'));
  });
};
