import HapiTemplates from 'vision';
import HapiStaticFiles from 'inert';
import HapiProxy from 'h2o2';
import KibiProxy from 'kibi-h2o2'; // kibi: use the kibi proxy
import { fromNode } from 'bluebird';

const plugins = [HapiTemplates, HapiStaticFiles, KibiProxy, HapiProxy];

async function registerPlugins(server) {
  await fromNode(cb => {
    server.register(plugins, cb);
  });
}

export default function (kbnServer, server) {
  registerPlugins(server);
}
