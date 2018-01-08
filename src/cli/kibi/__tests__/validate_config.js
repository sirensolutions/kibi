import validateYml from '../validate_config';
import maps from '../../../cli/kibi/kibi_to_siren_migration_maps';
import expect from 'expect.js';
const mockFs = require('mock-fs');
import { fromRoot } from '../../../utils';
let mapsStub;

const mockInvestigateYmlWithOldKeys = `
kibi_core:
  admin: bobdole
`;

const mockInvestigateYmlWithoutOldKeys = `
investigate_core:
  admin: bobdole
`;

const configFolderPath = fromRoot('config');
const mockConfigStructure = {};
mockConfigStructure[configFolderPath] = {
  'investigate_old.yml': mockInvestigateYmlWithOldKeys,
  'investigate_new.yml': mockInvestigateYmlWithoutOldKeys
};

describe('validate_config', () => {
  beforeEach(() => {
    mockFs(mockConfigStructure,
      {
        createCwd: false,
        createTmp: false
      });
  });
  afterEach(mockFs.restore);

  it('should return false if the yml contains any old keys', () => {
    expect(validateYml(`${fromRoot('config')}/investigate_old.yml`)).to.equal(false);
  });

  it('should return true if the yml does not contain any old keys', () => {
    expect(validateYml(`${fromRoot('config')}/investigate_new.yml`)).to.equal(true);
  });
});
