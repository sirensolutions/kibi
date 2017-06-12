import { format as formatUrl } from 'url';

import { delay } from 'bluebird';

import { KibanaServerStatus } from './status';
import { KibanaServerUiSettings } from './ui_settings';
import { KibanaServerVersion } from './version';

export function KibanaServerProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const lifecycle = getService('lifecycle');
  const es = getService('es');

  class KibanaServer {
    constructor() {
      const url = formatUrl(config.get('servers.kibana'));
      this.status = new KibanaServerStatus(url);
      this.version = new KibanaServerVersion(this.status);
      this.uiSettings = new KibanaServerUiSettings(log, es, this.version);

      lifecycle.on('beforeEachTest', async () => {
        await this.waitForStabilization();
      });
    }

    async waitForStabilization() {
      const { status, uiSettings } = this;

      let firstCheck = true;
      const pingInterval = 500; // ping every 500 ms for an update
      const startMs = Date.now();
      const timeout = config.get('timeouts.kibanaStabilize');

      while (true) {
        const exists = await uiSettings.existInEs();
        const state = await status.getOverallState();

        // kibi: check only if state is green as the configuration is not created automatically during startup.
        if (state === 'green') {
          log.debug(`The server is reporting a green status`);
          return;
        }

        if (firstCheck) {
          // we only log once, and only if we failed the first check
          firstCheck = false;
          log.debug(`waiting up to ${timeout}ms for kibana to stabilize...`);
        }

        if (Date.now() - startMs < timeout) {
          await delay(pingInterval);
          continue;
        }

        // kibi: check only the status as the configuration is not created automatically during startup
        throw new Error(`Kibana never stabilized: status is ${state}`);
      }
    }
  }

  return new KibanaServer();
}
