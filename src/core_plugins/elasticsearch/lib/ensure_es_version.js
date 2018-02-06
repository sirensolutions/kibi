/**
 * ES and Kibana versions are locked, so Kibana should require that ES has the same version as
 * that defined in Kibana's package.json.
 */

import { forEach, get } from 'lodash';
import SetupError from './setup_error';
import { pkg } from '../../../utils';

/**
 * tracks the node descriptions that get logged in warnings so
 * that we don't spam the log with the same message over and over.
 *
 * There are situations, like in testing or multi-tenancy, where
 * the server argument changes, so we must track the previous
 * node warnings per server
 */
const lastWarnedNodesForServer = new WeakMap();

export function ensureEsVersion(server, kibiVersion, clusterName = 'admin') { // kibi: kibiVersion added to properly report Kibi version
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster(clusterName);

  server.log(['plugin', 'debug'], 'Checking Elasticsearch version');
  return callWithInternalUser('nodes.info', {
    filterPath: [
      'nodes.*.version',
      'nodes.*.http.publish_address',
      'nodes.*.ip',
    ]
  })
  .then(function (info) {
    // Aggregate incompatible ES nodes.
    const incompatibleNodes = [];

    forEach(info.nodes, esNode => {
      if (!isEsCompatibleWithKibana(esNode.version)) {
        // Exit early to avoid collecting ES nodes with newer major versions in the `warningNodes`.
        return incompatibleNodes.push(esNode);
      }
    });

    function getHumanizedNodeNames(nodes) {
      return nodes.map(node => {
        const publishAddress =  get(node, 'http.publish_address') ? (get(node, 'http.publish_address') + ' ') : '';
        return 'v' + node.version + ' @ ' + publishAddress + '(' + node.ip + ')';
      });
    }

    function isEsCompatibleWithKibana(esVersion) {
      return (pkg.compatible_es_versions.indexOf(esVersion) !== -1);
    }

    if (incompatibleNodes.length) {
      const incompatibleNodeNames = getHumanizedNodeNames(incompatibleNodes);

      //kibi: changed the message
      const compatibleEsVersions = pkg.compatible_es_versions.join(', ').replace(/,(?!.*,)/gmi, ' or');
      const errorMessage =
        `Siren Investigate ${kibiVersion} requires Elasticsearch version${(pkg.compatible_es_versions.length > 1) ? 's ' : ' ' }` +
        `${compatibleEsVersions} on all nodes. I found ` +
        `the following incompatible nodes in your cluster: ${incompatibleNodeNames.join(', ')}`;

      throw new SetupError(server, errorMessage);
    }

    return true;
  });
}
