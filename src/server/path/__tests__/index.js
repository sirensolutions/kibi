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
});
