import { resolve } from 'path';

import { createServer } from '../../../test_utils/kbn_server';

export async function startupKibana({ port, esUrl }) {
  const server = createServer({
    server: {
      port,
      autoListen: true,
    },

    plugins: {
      scanDirs: [
        resolve(__dirname, '../../../core_plugins'),
        resolve(__dirname, '../../../kibi_plugins') // kibi: load kibi plugins in order to get the saved_objects_api plugin
      ],
    },

    elasticsearch: {
      url: esUrl
    }
  });

  await server.ready();
  return server;
}
