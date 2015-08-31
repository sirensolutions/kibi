define(function (require) {
  var _ = require('lodash');

  var $rootScope;
  var dashboardGroupHelper;

  function init() {
    return function () {
      module('kibana');

      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        dashboardGroupHelper = Private(require('components/kibi/dashboard_group_helper/dashboard_group_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    describe('DashboardGroupHelper', function () {
      beforeEach(init());

      it('shortenDashboardName should shorten', function () {
        expect( dashboardGroupHelper.shortenDashboardName('TEST', 'TEST dashboard') ).to.be('dashboard');
        expect( dashboardGroupHelper.shortenDashboardName('TEST', 'TEST-dashboard') ).to.be('dashboard');
      });

      it('shortenDashboardName should not shorten', function () {
        expect( dashboardGroupHelper.shortenDashboardName('BLA', 'TEST dashboard') ).to.be('TEST dashboard');
        expect( dashboardGroupHelper.shortenDashboardName('BLA', 'TEST-dashboard') ).to.be('TEST-dashboard');
      });

      it('_getListOfDashboardsFromGroups', function () {
        var dA = {id: 'A'};
        var dB = {id: 'B'};
        var dC = {id: 'C'};
        var groups = [
          {
            dashboards: [dA, dB]
          },
          {
            dashboards: [dA, dB, dC]
          }
        ];

        var actual = dashboardGroupHelper._getListOfDashboardsFromGroups(groups);
        expect(actual.length).to.be(3);
        expect(actual[0]).to.be(dA);
        expect(actual[1]).to.be(dB);
        expect(actual[2]).to.be(dC);
      });

    });
  });
});
