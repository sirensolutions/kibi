import { endsWith } from 'lodash';

module.exports = function (grunt) {
  const { resolve } = require('path');

  const version = grunt.config.get('pkg.kibi_version'); // kibi: use kibi version instead of kibana one
  const nodeVersion = grunt.config.get('nodeVersion');
  const rootPath = grunt.config.get('root');
  const baseUri = `https://nodejs.org/dist/v${nodeVersion}`;

  return [
    'darwin-x64',
    'linux-x64',
    'linux-x86',
    'windows-x86',
    'windows64' // kibi: we distinguish between windowses as we ship the native bindings for sqlite and node java
  ].map(function (baseName) {
    const win = ['windows-x86', 'windows64'].indexOf(baseName) >= 0; // kibi: include Windows 64

    // kibi: download Node for Windows from the correct locations
    let nodeUrl = `${baseUri}/node-v${nodeVersion}-${baseName}.tar.gz`;
    if (baseName === 'windows-x86') {
      nodeUrl = `${baseUri}/win-x86/node.exe`;
    } else if (baseName === 'windows64') {
      nodeUrl = `${baseUri}/win-x64/node.exe`;
    }
    // kibi: end

    const nodeDir = resolve(rootPath, `.node_binaries/${nodeVersion}/${baseName}`);

    const name = endsWith(baseName, '-x64')
      ? baseName.replace('-x64', '-x86_64')
      : baseName;

    const nodeShaSums = `${baseUri}/SHASUMS256.txt`;

    const buildName = `kibi-${version}-${name}`; // kibi: renamed kibana to kibi
    const buildDir = resolve(rootPath, `build/${buildName}`);

    const tarName = `${buildName}.tar.gz`;
    const tarPath = resolve(rootPath, `target/${tarName}`);

    const zipName = `${buildName}.zip`;
    const zipPath = resolve(rootPath, `target/${zipName}`);

    let debName;
    let debPath;
    let rpmName;
    let rpmPath;
    let debArch;
    let rpmArch;
    if (name.match('linux')) {
      debArch = name.match('x86_64') ? 'amd64' : 'i386';
      debName = `kibana-${version}-${debArch}.deb`;
      debPath = resolve(rootPath, `target/${debName}`);

      rpmArch = name.match('x86_64') ? 'x86_64' : 'i686';
      rpmName = `kibana-${version}-${rpmArch}.rpm`;
      rpmPath = resolve(rootPath, `target/${rpmName}`);
    }
    return {
      name, win,
      nodeUrl, nodeDir, nodeShaSums,
      buildName, buildDir,
      tarName, tarPath,
      zipName, zipPath,
      debName, debPath, debArch,
      rpmName, rpmPath, rpmArch
    };
  });
};
