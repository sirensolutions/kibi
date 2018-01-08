import expect from 'expect.js';
import path from '../';
import mockFs from 'mock-fs';
import { fromRoot } from '../../../utils';
import { accessSync, R_OK } from 'fs';

const fakeConfigStructure = {};
fakeConfigStructure[fromRoot('config')] = {
  'investigate.yml': ''
};
fakeConfigStructure[fromRoot('data')] = {
  'fakedate': ''
};

describe('Default path finder', function () {
  beforeEach(() => {
    mockFs(fakeConfigStructure);
  });

  afterEach(mockFs.restore);

  it('should find an investigate.yml', () => {
    const configPath = path.getConfig();
    expect(() => accessSync(configPath, R_OK)).to.not.throwError();
  });

  it('should find a data directory', () => {
    const dataPath = path.getData();
    expect(() => accessSync(dataPath, R_OK)).to.not.throwError();
  });

  describe('if kibi.yml in the config folder', () => {
    beforeEach(() => {
      const fileStructureWithKibiYml = {};
      fileStructureWithKibiYml[fromRoot('config')] = {
        'kibi.yml': ''
      };
      mockFs(fileStructureWithKibiYml);
    });

    afterEach(mockFs.restore);

    it('should throw an error', () => {
      expect(() => path.getConfig()).to.throwException();
    });
  });

  describe('if investigate.yml in the config folder but old config settings in yml', () => {
    beforeEach(() => {
      const fileStructureWithKibiYml = {};
      const fakeYml = `kibi_core:\n\t\tusername: 'bob'`;
      fileStructureWithKibiYml[fromRoot('config')] = {
        'investigate.yml': fakeYml
      };
      mockFs(fileStructureWithKibiYml);
    });

    afterEach(mockFs.restore);

    it('should throw an error', () => {
      expect(() => path.getConfig()).to.throwException();
    });
  });
});
