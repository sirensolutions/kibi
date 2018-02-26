import { validateYml, getConfigYmlPath } from '../validate_config';
import expect from 'expect.js';
const mockFs = require('mock-fs');
import { fromRoot } from '../../../utils';

const mockInvestigateYmlWithOldKeys = `
kibi_core:
  admin: bobdole
sentinl:
  sentinl:
    history: 10
`;

const mockInvestigateYmlWithoutOldKeys = `
investigate_core:
  admin_role: bobdole
  gremlin_server:
    path: path/to/gremlin.server
`;

const configFolderPath = fromRoot('config');

describe('validate_config', () => {
  describe('validateYml', () => {
    afterEach(mockFs.restore);
    it('should return false if the yml contains any old keys', (done) => {
      mockFs({ [`${configFolderPath}`]: { 'investigate.yml': mockInvestigateYmlWithOldKeys } });
      expect(validateYml(`${fromRoot('config')}/investigate.yml`)).to.equal(false);
      done();
    });

    it('should return true if the yml does not contain any old keys', (done) => {
      mockFs({ [`${configFolderPath}`]: { 'investigate.yml': mockInvestigateYmlWithoutOldKeys } });
      expect(validateYml(`${fromRoot('config')}/investigate.yml`)).to.equal(true);
      done();
    });
  });

  describe('getConfigYmlPath', () => {
    it('should return the filepath of the config based on the filename passed in', (done) => {
      const filename = 'fakeconfig';
      const configPathRegExp = new RegExp('^.*\/config\/' + filename + '\.yml$');
      expect(getConfigYmlPath(filename, null)).to.match(configPathRegExp);
      done();
    });

    it('should return the filepath of the dev config based if filename and dev = true passed in', (done) => {
      const filename = 'fakedevconfig';
      const devConfigPathRegExp = new RegExp('^.*\/config\/' + filename + '\.dev\.yml$');
      expect(getConfigYmlPath(filename, true)).to.match(devConfigPathRegExp);
      done();
    });
  });
});
