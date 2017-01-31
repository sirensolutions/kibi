let get = require('lodash').get;
let Joi = require('joi');
let fs = require('fs');
let path = require('path');

let utils = require('requirefrom')('src/utils');
let fromRoot = utils('fromRoot');
const randomBytes = require('crypto').randomBytes;
const getData = require('../path').getData;
import pkg from '../../../src/utils/packageJson';

let uiConfig;
try {
  uiConfig = require('../../../test/serverConfig');
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    // kibi: make sure karma.port is defined during optimize step
    // as the "test" folder is no longer present during this step
    uiConfig = {
      servers: {
        karma: {
          port: 9876
        }
      }
    };
  }
}


module.exports = () => Joi.object({
  pkg: Joi.object({
    version: Joi.string().default(Joi.ref('$version')),
    kibiVersion: Joi.string().default(Joi.ref('$kibiVersion')), // kibi: added to manage kibi version
    kibiKibanaAnnouncement: Joi.string().default(Joi.ref('$kibiKibanaAnnouncement')), // kibi: added by kibi
    kibiEnterpriseEnabled: Joi.boolean().default(Joi.ref('$kibiEnterpriseEnabled')), // kibi: added to manage kibi version
    buildNum: Joi.number().default(Joi.ref('$buildNum')),
    buildSha: Joi.string().default(Joi.ref('$buildSha')),
  }).default(),

  env: Joi.object({
    name: Joi.string().default(Joi.ref('$env')),
    dev: Joi.boolean().default(Joi.ref('$dev')),
    prod: Joi.boolean().default(Joi.ref('$prod'))
  }).default(),

  pid: Joi.object({
    file: Joi.string(),
    exclusive: Joi.boolean().default(false)
  }).default(),

  server: Joi.object({
    host: Joi.string().hostname().default('0.0.0.0'),
    port: Joi.number().default(5606), // kibi: changed to avoid colisions with kibana
    maxPayloadBytes: Joi.number().default(1048576),
    autoListen: Joi.boolean().default(true),
    defaultRoute: Joi.string(),
    basePath: Joi.string().default('').allow('').regex(/(^$|^\/.*[^\/]$)/, `start with a slash, don't end with one`),
    ssl: Joi.object({
      cert: Joi.string(),
      key: Joi.string()
    }).default(),
    cors: Joi.when('$dev', {
      is: true,
      then: Joi.object().default({
        origin: ['*://localhost:' + uiConfig.servers.karma.port] // karma test server
      }),
      otherwise: Joi.boolean().default(false)
    }),
    xsrf: Joi.object({
      disableProtection: Joi.boolean().default(false),
      token: Joi.string().optional().notes('Deprecated')
    }).default(),
  }).default(),

  logging: Joi.object().keys({
    silent: Joi.boolean().default(false),

    quiet: Joi.boolean()
    .when('silent', {
      is: true,
      then: Joi.default(true).valid(true),
      otherwise: Joi.default(false)
    }),

    verbose: Joi.boolean()
    .when('quiet', {
      is: true,
      then: Joi.valid(false).default(false),
      otherwise: Joi.default(false)
    }),

    events: Joi.any().default({}),
    dest: Joi.string().default('stdout'),
    filter: Joi.any().default({}),
    json: Joi.boolean()
    .when('dest', {
      is: 'stdout',
      then: Joi.default(!process.stdout.isTTY),
      otherwise: Joi.default(true)
    })
  })
  .default(),

  plugins: Joi.object({
    paths: Joi.array().items(Joi.string()).default([]),
    scanDirs: Joi.array().items(Joi.string()).default([]),
    initialize: Joi.boolean().default(true)
  }).default(),

  path: Joi.object({
    data: Joi.string().default(getData())
  }).default(),

  optimize: Joi.object({
    enabled: Joi.boolean().default(true),
    bundleFilter: Joi.string().default('!tests'),
    bundleDir: Joi.string().default(fromRoot('optimize/bundles')),
    viewCaching: Joi.boolean().default(Joi.ref('$prod')),
    lazy: Joi.boolean().default(false),
    lazyPort: Joi.number().default(5602),
    lazyHost: Joi.string().hostname().default('localhost'),
    lazyPrebuild: Joi.boolean().default(false),
    lazyProxyTimeout: Joi.number().default(5 * 60000),
    useBundleCache: Joi.boolean().default(Joi.ref('$prod')),
    unsafeCache: Joi
      .alternatives()
      .try(
        Joi.boolean(),
        Joi.string().regex(/^\/.+\/$/)
      )
      .default('/[\\/\\\\](node_modules|bower_components)[\\/\\\\]/'),
    sourceMaps: Joi
      .alternatives()
      .try(
        Joi.string().required(),
        Joi.boolean()
      )
      .default(Joi.ref('$dev')),
    profile: Joi.boolean().default(false)
  }).default(),

  status: Joi.object({
    allowAnonymous: Joi.boolean().default(false)
  }).default(),

  tilemap: Joi.object({
    url: Joi.string().default(`https://tiles.elastic.co/v1/default/{z}/{x}/{y}.png?my_app_name=kibana&my_app_version=${pkg.version}&elastic_tile_service_tos=agree`),
    options: Joi.object({
      attribution: Joi.string().default('© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)'),
      minZoom: Joi.number().min(1, 'Must not be less than 1').default(1),
      maxZoom: Joi.number().default(10),
      tileSize: Joi.number(),
      subdomains: Joi.array().items(Joi.string()).single(),
      errorTileUrl: Joi.string().uri(),
      tms: Joi.boolean(),
      reuseTiles: Joi.boolean(),
      bounds: Joi.array().items(Joi.array().items(Joi.number()).min(2).required()).min(2)
    }).default()
  }).default()

}).default();
