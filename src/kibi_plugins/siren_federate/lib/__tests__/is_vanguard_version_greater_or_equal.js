import expect from 'expect.js';
import { isVanguardVersionGreaterOrEqual } from '../is_vanguard_version_greater_or_equal';

describe('is_vanguard_version_greater_or_equal', function () {

  it('shoud say no', function () {
    expect(isVanguardVersionGreaterOrEqual('5.4.3', '5.4.3-1')).to.equal(false);
    expect(isVanguardVersionGreaterOrEqual('5.5.2', '5.5.2-1')).to.equal(false);
  });

  it('shoud say yes', function () {
    expect(isVanguardVersionGreaterOrEqual('5.4.3-1', '5.4.3-1')).to.equal(true);
    expect(isVanguardVersionGreaterOrEqual('5.5.2-1', '5.5.2-1')).to.equal(true);

    expect(isVanguardVersionGreaterOrEqual('5.4.3-2', '5.4.3-1')).to.equal(true);
    expect(isVanguardVersionGreaterOrEqual('5.5.2-2', '5.5.2-1')).to.equal(true);
  });
});
