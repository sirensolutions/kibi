// kibi: modified to build Kibi packages with the exception of S3 parameters (which we are not currently using).
export default (grunt) => {
  const VERSION = grunt.config.get('build.version');
  const SHORT_SHA = grunt.config.get('build.sha').substr(0, 7);

  const FOLDER_STAGING = `kibi/staging/${VERSION}-${SHORT_SHA}/repos/${VERSION.match(/\d\./)[0]}x`;
  const FOLDER_PRODUCTION = `kibi/${VERSION.match(/\d\./)[0]}x`;

  const FOLDERNAME_DEB = 'debian';
  const FOLDERNAME_RPM = 'centos';

  const PREFIX_STAGING_DEB = `${FOLDER_STAGING}/${FOLDERNAME_DEB}`;
  const PREFIX_STAGING_RPM = `${FOLDER_STAGING}/${FOLDERNAME_RPM}`;
  const PREFIX_PRODUCTION_DEB = `${FOLDER_PRODUCTION}/${FOLDERNAME_DEB}`;
  const PREFIX_PRODUCTION_RPM = `${FOLDER_PRODUCTION}/${FOLDERNAME_RPM}`;

  const FOLDER_CONFIG = '/opt/kibi/config';
  const FOLDER_HOME = '/opt/kibi';
  const FOLDER_DATA = '/var/lib/kibi';
  const FOLDER_LOGS = '/var/log/kibi';
  const FOLDER_PLUGINS = `${FOLDER_HOME}/plugins`;

  const FILE_KIBANA_CONF = `${FOLDER_CONFIG}/kibi.yml`;
  const FILE_KIBANA_BINARY = `${FOLDER_HOME}/bin/kibi`;

  return {
    publish: {
      staging: {
        bucket: 'download.elasticsearch.org',
        debPrefix: PREFIX_STAGING_DEB,
        rpmPrefix: PREFIX_STAGING_RPM
      },
      production: {
        bucket: 'packages.elasticsearch.org',
        debPrefix: PREFIX_PRODUCTION_DEB,
        rpmPrefix: PREFIX_PRODUCTION_RPM
      }
    },
    user: 'kibi',
    group: 'kibi',
    name: 'kibi',
    description: 'Kibi Community Edition',
    site: 'http://siren.solutions',
    vendor: 'Siren Solutions',
    maintainer: 'Siren Solutions\ \<info@siren.solutions\>',
    license: 'Apache\ 2.0',
    version: VERSION,
    path: {
      conf: FOLDER_CONFIG,
      data: FOLDER_DATA,
      plugins: FOLDER_PLUGINS,
      logs: FOLDER_LOGS,
      home: FOLDER_HOME,
      kibanaBin: FILE_KIBANA_BINARY,
      kibanaConfig: FILE_KIBANA_CONF
    }
  };
};
