import mockFs from 'mock-fs';
import fromRoot from '../../../utils';

describe('Migrate Kibi Config', () => {

  beforeEach(() => {
    const configFolderPath = fromRoot('config');
    mockFs({
      configFolderPath: {}
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should replace only the settings in the map to the new values', (done) => {
    done();
  });
  xit('should replace the settings in the map to the new values for the dev.yml if invoked with --dev flag', () => {});
  xit('should return silently if no kibi.yml', () => {});
});