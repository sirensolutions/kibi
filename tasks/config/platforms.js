import { endsWith } from 'lodash';

module.exports = function (grunt) {
  let { resolve } = require('path');

  let version = grunt.config.get('pkg.kibi_version'); // kibi: use kibi version instead of kibana one
  let nodeVersion = grunt.config.get('nodeVersion');
  let rootPath = grunt.config.get('root');
  let baseUri = `https://nodejs.org/dist/v${nodeVersion}`;

  return [
    'darwin-x64',
    'linux-x64',
    'linux-x86',
    'windows',
    'windows64' // kibi: we distinguish between windowses as we ship the native bindings for sqlite and node java
  ].map(function (name) {
    const win = name === 'windows' || name === 'windows64';

    let nodeUrl;
    if (name === 'windows') {
      nodeUrl = `${baseUri}/win-x86/node.exe`;
    } else if (name === 'windows64') {
      nodeUrl = `${baseUri}/win-x64/node.exe`;
    } else {
      nodeUrl = `${baseUri}/node-v${nodeVersion}-${name}.tar.gz`;
    }

    let nodeDir = resolve(rootPath, `.node_binaries/${nodeVersion}/${name}`);

    let buildName = `kibi-${version}-${name}`; // kibi: renamed kibana to kibi
    let buildDir = resolve(rootPath, `build/${buildName}`);

    let tarName = `${buildName}.tar.gz`;
    let tarPath = resolve(rootPath, `target/${tarName}`);

    let zipName = `${buildName}.zip`;
    let zipPath = resolve(rootPath, `target/${zipName}`);

    let debName;
    let debPath;
    let rpmName;
    let rpmPath;
    if (name.match('linux')) {
      let debArch = name.match('x64') ? 'amd64' : 'i386';
      debName = `kibana_${version}_${debArch}.deb`;
      debPath = resolve(rootPath, `target/${debName}`);

      let rpmArch = name.match('x64') ? 'x86_64' : 'i386';
      rpmName = `kibana-${version.replace('-', '_')}-1.${rpmArch}.rpm`;
      rpmPath = resolve(rootPath, `target/${rpmName}`);
    }
    return {
      name, win,
      nodeUrl, nodeDir,
      buildName, buildDir,
      tarName, tarPath,
      zipName, zipPath,
      debName, debPath,
      rpmName, rpmPath
    };
  });
};
