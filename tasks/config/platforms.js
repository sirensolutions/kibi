import { endsWith } from 'lodash';

import { resolve } from 'path';

module.exports = function (grunt) {
  const version = grunt.config.get('pkg.kibi_version'); // kibi: use kibi version instead of kibana one
  const nodeVersion = grunt.config.get('nodeVersion');
  const rootPath = grunt.config.get('root');
  const baseUri = `https://nodejs.org/dist/v${nodeVersion}`;

  return [
    'darwin-x64',
    'linux-x64',
    'linux-x86', // kibi: we still support linux 32 bit
    'windows-x64'
  ].map(function (baseName) {
    const win = baseName === 'windows-x64';

    const nodeUrl = win ? `${baseUri}/win-x64/node.exe` : `${baseUri}/node-v${nodeVersion}-${baseName}.tar.gz`;
    const nodeDir = resolve(rootPath, `.node_binaries/${nodeVersion}/${baseName}`);

    const name = baseName.replace('-x64', '-x86_64');

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
