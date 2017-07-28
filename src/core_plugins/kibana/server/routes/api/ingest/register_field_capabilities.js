import _ from 'lodash';
import handleESError from '../../../lib/handle_es_error';

export function registerFieldCapabilities(server) {
  server.route({
    path: '/api/kibana/{indices}/field_capabilities',
    method: ['GET'],
    handler: function (req, reply) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const indices = req.params.indices || '';

      // kibi: use field_caps instead of field_stats
      return callWithRequest(req, 'fieldCaps', {
        fields: '*',
        index: indices,
        allowNoIndices: false
      })
      .then(
        (res) => {
          const fields = _.get(res, 'fields', {});
          const fieldsFilteredValues = _.mapValues(fields, value => {
            const capabilities = {
              searchable: false,
              aggregatable: false
            };
            _.each(value, (caps, type) => {
              if (caps.searchable) {
                capabilities.searchable = true;
              }
              if (caps.aggregatable) {
                capabilities.aggregatable = true;
              }
            });
            return capabilities;
          });

          const retVal = { fields: fieldsFilteredValues };
          if (res._shards && res._shards.failed) {
            retVal.shard_failure_response = res;
          }

          reply(retVal);
        },
        (error) => {
          reply(handleESError(error));
        }
      );
      // kibi: end
    }
  });
}
