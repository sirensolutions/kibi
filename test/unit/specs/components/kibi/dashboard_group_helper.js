define(function (require) {

  var fakeSavedDashboards           = require('fixtures/saved_dashboards');
  var fakeEmptySavedDashboards      = require('fixtures/empty_saved_dashboards');
  var fakeSavedDashboardGroups      = require('fixtures/fake_saved_dashboard_groups');
  var fakeEmptySavedDashboardGroups = require('fixtures/fake_empty_saved_dashboard_groups');

  var $rootScope;
  var dashboardGroupHelper;

  function init(savedDashboardsImpl, savedDashboardGroupsImpl) {
    return function () {

      module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', savedDashboardsImpl);
      });

      module('dashboard_groups_editor/services/saved_dashboard_groups', function ($provide) {
        $provide.service('savedDashboardGroups', savedDashboardGroupsImpl);
      });

      module('kibana');

      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        dashboardGroupHelper = Private(require('components/kibi/dashboard_group_helper/dashboard_group_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    describe('DashboardGroupHelper', function () {

      beforeEach(init(fakeSavedDashboards, fakeSavedDashboardGroups));

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

      it('getIdsOfDashboardGroupsTheseDashboardsBelongTo - there is a group with a dashboard', function (done) {
        var dashboardIds = ['Articles'];
        var expected = ['group-1'];

        dashboardGroupHelper.getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds).then(function (groupIds) {
          expect(groupIds).to.eql(expected);
          done();
        });

        $rootScope.$apply();
      });


      it('getIdsOfDashboardGroupsTheseDashboardsBelongTo - there is NOT a group with a dashboard', function (done) {
        var dashboardIds = ['ArticlesXXX'];

        dashboardGroupHelper.getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds).then(function (groupIds) {
          expect(groupIds).to.eql([]);
          done();
        });

        $rootScope.$apply();
      });

      it('computeGroups 1', function (done) {
        var expected = [];
        dashboardGroupHelper.computeGroups().then(function (groups) {

          expect(groups).to.have.length(5);

          expect(groups[0].title).to.equal('Group 1');
          expect(groups[0].dashboards).to.have.length(2);
          expect(groups[0].dashboards[0].id).to.match(/^Companies|Articles$/);
          expect(groups[0].dashboards[1].id).to.match(/^Companies|Articles$/);

          expect(groups[1].title).to.equal('Group 2');
          expect(groups[1].dashboards).to.have.length(0);

          expect(groups[2].title).to.equal('time testing 1');
          expect(groups[2].dashboards).to.have.length(1);
          expect(groups[2].dashboards[0].id).to.equal('time-testing-1');
          expect(groups[2].dashboards[0].title).to.equal('time testing 1');

          expect(groups[3].title).to.equal('time testing 2');
          expect(groups[3].dashboards).to.have.length(1);
          expect(groups[3].dashboards[0].id).to.equal('time-testing-2');
          expect(groups[3].dashboards[0].title).to.equal('time testing 2');

          expect(groups[4].title).to.equal('time testing 3');
          expect(groups[4].dashboards).to.have.length(1);
          expect(groups[4].dashboards[0].id).to.equal('time-testing-3');
          expect(groups[4].dashboards[0].title).to.equal('time testing 3');

          done();
        });

        $rootScope.$apply();
      });


    });

    describe('DashboardGroupHelper - no dashboards', function () {
      beforeEach(init(fakeEmptySavedDashboards, fakeSavedDashboardGroups));

      it('computeGroups 2', function (done) {
        var expected = [];
        dashboardGroupHelper.computeGroups().then(function (groups) {
          // here if there are groups but there is no dashboards we should still get the groups
          expect(groups).to.have.length(2);
          done();
        });

        $rootScope.$apply();
      });
    });

    describe('DashboardGroupHelper - no dashboards groups', function () {
      beforeEach(init(fakeSavedDashboards, fakeEmptySavedDashboardGroups));

      it('computeGroups 3', function (done) {
        var expected = [];
        dashboardGroupHelper.computeGroups().then(function (groups) {
          // here if there are no groups but there are 5 dashboards we expect 5 pseudo group created
          expect(groups).to.have.length(5);
          done();
        });

        $rootScope.$apply();
      });
    });

    describe('DashboardGroupHelper - no dashboards groups, no dashboards', function () {
      beforeEach(init(fakeEmptySavedDashboards, fakeEmptySavedDashboardGroups));

      it('computeGroups 4', function (done) {
        var expected = [];
        dashboardGroupHelper.computeGroups().then(function (groups) {
          // here if there are no groups but there are 5 dashboards we expect 5 pseudo group created
          expect(groups).to.have.length(0);
          done();
        });

        $rootScope.$apply();
      });
    });

  });
});
