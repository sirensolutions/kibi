import validateYml from '../validate_config';
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

  it('should return false if the yml contains any old keys', (done) => {
    mockFs({ [`${configFolderPath}`]: { 'investigate.yml': mockInvestigateYmlWithOldKeys } });
    expect(validateYml(`${fromRoot('config')}/investigate.yml`)).to.equal(false);
    mockFs.restore();
    done();
  });

  it('should return true if the yml does not contain any old keys', (done) => {
    mockFs({ [`${configFolderPath}`]: { 'investigate.yml': mockInvestigateYmlWithoutOldKeys } });
    expect(validateYml(`${fromRoot('config')}/investigate.yml`)).to.equal(true);
    mockFs.restore();
    done();
  });
});
