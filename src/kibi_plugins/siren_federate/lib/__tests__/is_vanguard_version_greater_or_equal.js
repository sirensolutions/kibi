import expect from 'expect.js';
import { isVanguardVersionGreaterOrEqual } from '../is_vanguard_version_greater_or_equal';

describe('is_vanguard_version_greater_or_equal', function () {

  it('should return false', function () {
    expect(isVanguardVersionGreaterOrEqual('5.4.3', '5.4.3-1')).to.equal(false);
    expect(isVanguardVersionGreaterOrEqual('5.5.2', '5.5.2-1')).to.equal(false);

    expect(isVanguardVersionGreaterOrEqual('7.8.9-1', '7.8.9-2')).to.equal(false);
  });

  it('should return true', function () {
    expect(isVanguardVersionGreaterOrEqual('5.4.3-1', '5.4.3-1')).to.equal(true);
    expect(isVanguardVersionGreaterOrEqual('5.5.2-1', '5.5.2-1')).to.equal(true);

    expect(isVanguardVersionGreaterOrEqual('5.4.3-2', '5.4.3-1')).to.equal(true);
    expect(isVanguardVersionGreaterOrEqual('5.5.2-2', '5.5.2-1')).to.equal(true);

    expect(isVanguardVersionGreaterOrEqual('7.8.9-12', '7.8.9-11')).to.equal(true);
  });
});
