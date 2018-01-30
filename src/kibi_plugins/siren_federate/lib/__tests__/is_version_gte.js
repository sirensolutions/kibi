import expect from 'expect.js';
import { isVersionGreaterThanOrEqual } from '../is_version_gte';

describe('isVersionGreaterOrEqual', function () {

  it('should return false', function () {
    expect(isVersionGreaterThanOrEqual('5.4.3', '5.4.3-1')).to.equal(false);
    expect(isVersionGreaterThanOrEqual('5.5.2', '5.5.2-1')).to.equal(false);

    expect(isVersionGreaterThanOrEqual('7.8.9-1', '7.8.9-2')).to.equal(false);
  });

  it('should return true', function () {
    expect(isVersionGreaterThanOrEqual('5.4.3-1', '5.4.3-1')).to.equal(true);
    expect(isVersionGreaterThanOrEqual('5.5.2-1', '5.5.2-1')).to.equal(true);

    expect(isVersionGreaterThanOrEqual('5.4.3-2', '5.4.3-1')).to.equal(true);
    expect(isVersionGreaterThanOrEqual('5.5.2-2', '5.5.2-1')).to.equal(true);

    expect(isVersionGreaterThanOrEqual('7.8.9-12', '7.8.9-11')).to.equal(true);
  });
});
