const mockFs = require('mock-fs');
import { fromRoot } from '../../../utils';
import migrateKibiYml from '../_migrate_kibi_yml';
import fs from 'fs';
import jsYaml from 'js-yaml';
import expect from 'expect.js';
import sinon from 'sinon';
import path from 'path';

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

const configFolderPath = fromRoot('config');
const mockConfigStructure = {};
mockConfigStructure[configFolderPath] = {
  'kibi.yml': mockKibiYml,
  'kibi.dev.yml': mockKibiDevYml
};

describe('Migrate Kibi Config', () => {
  beforeEach(() => {
    mockFs(mockConfigStructure,
      {
        createCwd: false,
        createTmp: false
      });
  });

  afterEach(mockFs.restore);

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
    const mockSafeDump = sinon.stub(jsYaml, 'safeDump', contents => {
      // kibi_access_control should have changed to investigate_access_control
      expect(contents).to.have.property('investigate_access_control');
      expect(contents).to.not.have.property('kibi_access_control');
      // kibi_core should have changed to investigate_core
      expect(contents).to.have.property('investigate_core');
      expect(contents).to.not.have.property('kibi_core');
      // kibi_access_control.sentinl should have changed to investigate_access_control.sirenalert
      expect(contents.investigate_access_control).to.have.property('sirenalert');
      expect(contents.investigate_access_control).to.not.have.property('sentinl');
    });

    const options = {
      config: `${configFolderPath}/kibi.yml`,
      dev: false
    };

    migrateKibiYml(options);

    mockSafeDump.restore();

    done();
  });

  it('should insert the old defaults explicitly if not changed by the user', (done) => {
    const mockSafeDump = sinon.stub(jsYaml, 'safeDump', contents => {
      // investigate_access_control.sirenalert.username should have been added with the value 'sentinl'
      expect(contents).to.have.property('investigate_access_control');
      expect(contents.investigate_access_control).to.have.property('sirenalert');
      expect(contents.investigate_access_control.sirenalert).to.have.property('username');
      expect(contents.investigate_access_control.sirenalert.username).to.equal('sentinl');
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

    mockSafeDump.restore();

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