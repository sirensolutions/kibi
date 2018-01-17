const mockFs = require('mock-fs');
import { fromRoot } from '../../../utils';
import migrateKibiYml from '../_migrate_kibi_yml';
import fs from 'fs';
import jsYaml from 'js-yaml';
import expect from 'expect.js';
import sinon from 'sinon';
import path from 'path';

let mockSafeDump;

const mockKibiYml = `
kibana:
  index: '.kibi_or_not_kibi'
kibi_core: 
  admin: 'ted'
kibi_access_control.sentinl.foo: 'bar'
`;

const mockKibiDevYml = `
kibana:
  index: '.kibi_or_not_kibi'
kibi_core:
  admin: 'bob'
kibi_access_control:
  sentinl:
    foo: 'bar'
    username: 'sentinl'
`;

const mockKibiYmlWithGremlinSettingsIncludingCustomURLAndSSLca = `
kibana:
  index: '.customGremlinIndex'
kibi_core: 
  admin: 'chad'
  gremlin_server:
    path: 'gremlin_server/gremlin-es2-server.jar'
    url: 'http://my-custom-gremlin-route'
    ssl:
      ca: 'pki/custom-cacert.pem'
kibi_access_control.sentinl.foo: 'bar'
`;

const mockKibiYmlWithGremlinSettings = `
kibana:
  index: '.defaultGremlinIndex'
kibi_core: 
  admin: 'alex'
  gremlin_server:
    path: 'gremlin_server/gremlin-es2-server.jar'
    url: 'https://127.0.0.1:8061'
kibi_access_control.sentinl.foo: 'bar'
`;

const configFolderPath = fromRoot('config');
const mockConfigStructure = {};
mockConfigStructure[configFolderPath] = {
  'kibi.yml': mockKibiYml,
  'kibi.dev.yml': mockKibiDevYml,
  'kibi.gremlin.yml':mockKibiYmlWithGremlinSettings,
  'kibi.custom.gremlin.yml': mockKibiYmlWithGremlinSettingsIncludingCustomURLAndSSLca
};

describe('Migrate Kibi Config', () => {
  beforeEach(() => {
    mockFs(mockConfigStructure,
      {
        createCwd: false,
        createTmp: false
      });
  });

  afterEach(function () {
    mockFs.restore();

    if(mockSafeDump) {
      mockSafeDump.restore();
    }
  });

  it('should backup and replace the kibi.yml config file', (done) => {
    const options = {
      config: `${configFolderPath}/kibi.yml`,
      dev: false
    };

    migrateKibiYml(options);
    //it should have written the file as investigate.yml
    expect(fs.accessSync(`${configFolderPath}/investigate.yml`)).to.be(undefined);
    // it should have backed up the old kibi.yml
    expect(fs.accessSync(`${configFolderPath}/kibi.yml.pre10`)).to.be(undefined);
    // it should have removed the old kibi.yml
    expect(() => fs.accessSync(`${configFolderPath}/kibi.yml`)).to.throwError();

    done();
  });

  it('should replace only the settings in the map to the new values', (done) => {
    mockSafeDump = sinon.stub(jsYaml, 'safeDump', contents => {
      // kibi_access_control should have changed to investigate_access_control
      expect(contents).to.have.property('investigate_access_control');
      expect(contents).to.not.have.property('kibi_access_control');
      // kibi_core should have changed to investigate_core
      expect(contents).to.have.property('investigate_core');
      expect(contents).to.not.have.property('kibi_core');
    });

    const options = {
      config: `${configFolderPath}/kibi.yml`,
      dev: false
    };

    migrateKibiYml(options);

    done();
  });

  it('should insert the old defaults explicitly if not changed by the user', (done) => {
    mockSafeDump = sinon.stub(jsYaml, 'safeDump', contents => {
      // investigate_access_control.sirenalert.username should have been added with the value 'sentinl'
      expect(contents).to.have.property('investigate_access_control');
      // investigate_access_control.admin_role should have been added with the value 'kibiadmin'
      expect(contents).to.have.property('investigate_access_control');
      expect(contents.investigate_access_control).to.have.property('admin_role');
      expect(contents.investigate_access_control.admin_role).to.equal('kibiadmin');
      // the .kibi and .kibiaccess indexes should have been added explicitly
      expect(contents.investigate_access_control.acl.index).to.equal('.kibiaccess');
      expect(contents.kibana.index).to.equal('.kibi_or_not_kibi');
    });

    const options = {
      config: `${configFolderPath}/kibi.yml`,
      dev: false
    };

    migrateKibiYml(options);

    done();
  });

  it('should replace the settings in the map to the new values for the dev.yml if invoked with --dev flag', (done) => {
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync', (filepath, encoding) => {
      if (path.dirname(filepath) === fromRoot('config')) {
        expect(path.basename(filepath)).to.equal('investigate.dev.yml');
      }
    });

    const readFileSyncStub = sinon.stub(fs, 'readFileSync', (filepath, encoding) => {
      expect(path.basename(filepath)).to.equal('kibi.dev.yml');
      return mockKibiDevYml;
    });

    const options = {
      dev: true
    };

    migrateKibiYml(options);

    fs.writeFileSync.restore();
    fs.readFileSync.restore();

    done();
  });

  it('should remove any gremlin_server setting that is set to the old default and remove the gremlin-server stanza', (done) => {
    mockSafeDump = sinon.stub(jsYaml, 'safeDump', contents => {
      expect(contents).to.have.property('investigate_core');
      // as there are no properties of the gremlin_server left (they were all old default values that have been rolled into Investigate)
      // the stanza itself should have been removed
      expect(contents.investigate_core).to.not.have.property('gremlin_server');
    });

    const options = {
      config: `${configFolderPath}/kibi.gremlin.yml`,
      dev: false
    };

    migrateKibiYml(options);

    done();
  });

  it('should remove any gremlin_server setting that is set to the old default but leave the stanza if any custom settings', (done) => {
    mockSafeDump = sinon.stub(jsYaml, 'safeDump', contents => {
      expect(contents).to.have.property('investigate_core');
      //just checking the other values were not affected
      expect(contents.investigate_core).to.have.property('admin');
      expect(contents.investigate_core.admin).to.equal('chad');
      // check the stanza is still there (because the custom properties need to remain)
      expect(contents.investigate_core).to.have.property('gremlin_server');
      expect(Object.keys(contents.investigate_core.gremlin_server)).to.have.length(2);
      // check the custom properties of gremlin_server are unchanged from the yml passed in
      expect(contents.investigate_core.gremlin_server).to.have.property('url');
      expect(contents.investigate_core.gremlin_server.url).to.equal('http://my-custom-gremlin-route');
      expect(contents.investigate_core.gremlin_server).to.have.property('ssl');
      expect(contents.investigate_core.gremlin_server.ssl).to.have.property('ca');
      expect(contents.investigate_core.gremlin_server.ssl.ca).to.equal('pki/custom-cacert.pem');
    });

    const options = {
      config: `${configFolderPath}/kibi.custom.gremlin.yml`,
      dev: false
    };

    migrateKibiYml(options);

    done();
  });

  it('should return with a warning if no kibi.yml', () => {
    const options = {
      config: `${configFolderPath}/notkibi.yml`,
      dev: false
    };

    expect(() => migrateKibiYml(options)).to.throwException(`\nNo kibi.yml found to migrate,
    This command will migrate your kibi.yml to investigate.yml and update settings
    Please ensure you are running the correct command and the config path is correct (if set)`);
  });

});