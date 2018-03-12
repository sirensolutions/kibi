import Promise from 'bluebird';
import { get, has } from 'lodash';
import { merge } from 'lodash';
import Elasticdump from 'elasticdump';
import { join } from 'path';

export default class Dump {
  constructor(config, backupDir) {
    this._config = config;
    this._backupDir = backupDir;
    this._elasticdumpOptions = {
      scrollTime: '1m',
      offset: 0,
      limit: 100
    };
    this._originalTlsRejectUnauthorizedValue = undefined;
  }

  async getElasticsearchURL() {
    const url = await get(this._config, 'elasticsearch.url', 'http://localhost:9200');
    if (has(this._config, 'elasticsearch.username') && has(this._config, 'elasticsearch.password')) {
      const [ protocol, ...rest] = url.split('//');
      if (protocol === 'https:') {
        if (this._config.elasticsearch.ssl.verificationMode !== 'none') {
          console.warn('SSL WARNING: The certificates of the cluster will not be verified during this operation');
        }
        if(process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
          this._originalTlsRejectUnauthorizedValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
      }

      const username = get(this._config, 'elasticsearch.username');
      const password = get(this._config, 'elasticsearch.password');

      return `${protocol}//${username}:${password}@${rest.join('//')}`;
    }


    return url;
  }

  async fromElasticsearchToFile(index, type) {
    const input = await this.getElasticsearchURL();
    const output = join(this._backupDir, `${type}-${index}.json`);

    const options = merge({
      'input-index': index,
      type,
      input,
      output
    }, this._elasticdumpOptions);

    await this._dump(input, output, options);
  }

  async fromFileToElasticsearch(index, type) {
    const input = join(this._backupDir, `${type}-${index}.json`);
    const output = await this.getElasticsearchURL();

    const options = merge({
      'output-index': index,
      type,
      input,
      output
    }, this._elasticdumpOptions);
    await this._dump(input, output, options);
  }

  async _dump(input, output, options) {
    const elasticdump = new Elasticdump(input, output, options);
    elasticdump.on('log', message => console.log(message));
    elasticdump.on('error', message => console.error(message));
    await Promise.fromNode(cb => elasticdump.dump(cb));

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = this._originalTlsRejectUnauthorizedValue;
  }
}
