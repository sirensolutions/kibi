import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

let config;
let timefilter;
let $parentScope;

describe('Timefilter', function () {

  beforeEach(function () {

    ngMock.module('kibana');

    ngMock.inject(function ($rootScope, _config_,  _timefilter_) {
      config = _config_;
      timefilter = _timefilter_;
      sinon.stub(config, 'get', function (key) {
        if (key === 'siren:timePrecision') {
          return 's';
        }
      });
      $parentScope = $rootScope;
    });
  });

  it('should assign sirenTimePrecision to $rootScope', function () {
    expect($parentScope.sirenTimePrecision).to.equal('s');
  });

});
