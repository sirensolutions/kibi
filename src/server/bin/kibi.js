#!/usr/bin/env node

var program = require('commander');
var env = (process.env.NODE_ENV) ? process.env.NODE_ENV : 'development';
var path = require('path');
var packagePath = path.resolve(__dirname, '..', '..', '..', 'package.json');
var fs = require('fs');
if (env !== 'development') {
  packagePath = path.resolve(__dirname, '..', 'package.json');
}
var package = require(packagePath);


program.description(
  'Kibi extends Kibana with data intelligence features. ' +
  'At the core, kibi can join and filter data live from multiple indexes (elasticsearch) or from SQL/NOSQL sources. ' +
  'Kibana is a trademark of Elasticsearch BV, registered in the U.S. and in other countries.');
program.version(package.version);
program.option('-e, --elasticsearch <uri>', 'Elasticsearch instance');
program.option('-c, --config <path>', 'Path to the config file');
program.option('-p, --port <port>', 'The port to bind to', parseInt);
program.option('-q, --quiet', 'Turns off logging');
program.option('-H, --host <host>', 'The host to bind to');
program.option('-l, --log-file <path>', 'The file to log to');
program.option('--plugins <path>', 'Path to scan for plugins');
program.parse(process.argv);

// This needs to be set before the config is loaded. CONFIG_PATH is used to
// override the kibana.yml config path which gets read when the config/index.js
// is parsed for the first time.
if (program.config) {
  process.env.CONFIG_PATH = program.config;
}

// This needs to be set before the config is loaded. PLUGINS_PATH is used to
// set the external plugins folder.
if (program.plugins) {
  process.env.PLUGINS_FOLDER = program.plugins;
}

// Load the config
var config = require('../config');

if (program.elasticsearch) {
  config.elasticsearch = program.elasticsearch;
}

if (program.port) {
  config.port = program.port;
}

if (program.quiet) {
  config.quiet = program.quiet;
}

if (program.logFile) {
  config.log_file = program.logFile;
}

if (program.host) {
  config.host = program.host;
}


// Load and start the server. This must happen after all the config changes
// have been made since the server also requires the config.
var server = require('../');
var logger = require('../lib/logger');
var serverStart = function (err) {
  // If we get here then things have gone sideways and we need to give up.
  if (err) {
    logger.fatal({ err: err });
    process.exit(1);
  }

  if (config.kibana.pid_file) {
    return fs.writeFile(config.kibana.pid_file, process.pid, function (err) {
      if (err) {
        logger.fatal({ err: err }, 'Failed to write PID file to %s', config.kibana.pid_file);
        process.exit(1);
      }
      readyMessage();
    });
  }
  readyMessage();
};

var isProcessRunning = function (pid) {
  try {
    return process.kill(pid, 0);
  }
  catch (e) {
    return e.code === 'EPERM';
  }
};

if (config.kibana.pid_file) {
  fs.readFile(config.kibana.pid_file, fs.R_OK, function (err, pid) {
    if (!err && isProcessRunning(pid.toString())) {
      logger.warn('An instance of Kibi is already running with PID=%s', pid);
      process.exit(0);
    }
    server.start(serverStart);
  });
} else {
  server.start(serverStart);
}

function readyMessage() {
  console.log('****************************************');
  console.log('  Kibi server started successfully.');
  console.log('  Open your browser at:');
  console.log('  http://' + (config.host === '0.0.0.0' ? 'localhost' : config.host) + ':' + config.port);
  console.log('****************************************');
}
