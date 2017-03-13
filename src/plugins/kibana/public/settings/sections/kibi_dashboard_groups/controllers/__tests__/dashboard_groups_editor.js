var expect = require('expect.js');
var sinon = require('auto-release-sinon');
var ngMock = require('ngMock');
var $ = require('jquery');
var $scope;
var $el;

var mockSavedObjects = require('fixtures/kibi/mock_saved_objects');

describe('Kibi Controllers', function () {

  function init({ dashboardGroup, savedDashboardGroups }) {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardTitle', '');
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.module('app/dashboard', function ($provide) {

      $provide.service('savedDashboardGroups', (Promise, Private) => {
        return mockSavedObjects(Promise, Private)('savedDashboardGroups', savedDashboardGroups);
      });

      $provide.service('savedDashboards', function (Promise) {
        return {
          get: function (id) {
            switch (id) {
              case 'Cats':
                return Promise.resolve({ id: 'Cats', title: 'Water' });
              case 'Dogs':
                return Promise.resolve({ id: 'Dogs', title: 'Boiled' });
              default:
                return Promise.reject(new Error('try again'));
            }
          },
          find: function () {
            return Promise.resolve(
              [
                {
                  id: 'Dogs'
                }
              ]
              );
          }
        };
      });
    });
    ngMock.inject(function (Promise, _$rootScope_, $controller) {
      var fakeRoute = {
        current: {
          locals: {
            dashboardGroup: dashboardGroup
          }
        }
      };

      dashboardGroup.save = sinon.stub().returns(Promise.resolve('123'));

      $scope = _$rootScope_;
      $controller('DashboardGroupsEditor', {
        $scope: $scope,
        $route: fakeRoute,
        $element: $('<div><form name="objectForm" class="ng-valid"></div>')
      });
      $scope.$digest();
    });
  }

  describe('dashboard groups editor', function () {
    it('should retrieve the title of the dashboard from its id', function () {
      init({
        dashboardGroup : {
          dashboards: [
            {
              id: 'Dogs'
            },
            {
              id: 'Cats'
            }
          ]
        }
      });

      $scope.$digest();

      expect($scope.dashboardGroup).to.be.ok();
      expect($scope.dashboardGroup.dashboards).to.have.length(2);
      expect($scope.dashboardGroup.dashboards[0].title).to.be('Boiled');
      expect($scope.dashboardGroup.dashboards[1].title).to.be('Water');
    });

    it('should only retrieve the title of the dashboard if it is missing', function () {
      init({
        dashboardGroup :{
          dashboards: [
            {
              id: 'Dogs',
              title: 'my bad one'
            },
            {
              id: 'Cats'
            }
          ]
        }
      });

      $scope.$digest();

      expect($scope.dashboardGroup).to.be.ok();
      expect($scope.dashboardGroup.dashboards).to.have.length(2);
      expect($scope.dashboardGroup.dashboards[0].title).to.be('my bad one');
      expect($scope.dashboardGroup.dashboards[1].title).to.be('Water');
    });

    it('should save the dashboardGroup on submit', function (done) {
      init({
        dashboardGroup: {
          dashboards: [
            {
              id: 'Dogs'
            }
          ]
        }
      });

      $scope.submit();
      $scope.$on('kibi:dashboardgroup:changed', function (event, groupId) {
        expect(groupId).to.be('123');
        done();
      });

      $scope.$digest();

      expect($scope.dashboardGroup.save.called).to.be.ok();
    });

    it('forbid assigning a dashboard to more than one group', function () {

      init({
        dashboardGroup: {
          dashboards: [
            {
              id: 'About',
              title: 'About'
            }
          ]
        },
        savedDashboardGroups: [
          {
            dashboards: [
              {
                id: 'About',
                title: 'About'
              },
              {
                id: 'Companies',
                title: 'Companies'
              }
            ]
          }
        ]
      });

      $scope.$digest();

      expect($scope.filter({ value: 'About' })).to.be(true);
      expect($scope.filter({ value: 'Companies' })).to.be(true);
      expect($scope.filter({ value: 'Articles' })).to.be(false);
    });

    it('forbid assigning a dashboard to more than one group for two dashboard groups', function () {

      init({
        dashboardGroup: {
          dashboards: [
            {
              id: 'About',
              title: 'About'
            },
          ]
        },
        savedDashboardGroups: [
          {
            dashboards: [
              {
                id: 'About',
                title: 'About'
              },
              {
                id: 'Companies',
                title: 'Companies'
              }
            ]
          },
          {
            dashboards: [
              {
                id: 'Investors',
                title: 'Investors'
              },
              {
                id: 'Articles detailed per source',
                title: 'Articles detailed per source'
              }
            ]
          }
        ]
      });

      $scope.$digest();

      expect($scope.filter({ value: 'About' })).to.be(true);
      expect($scope.filter({ value: 'Companies' })).to.be(true);
      expect($scope.filter({ value: 'Articles' })).to.be(false);
      expect($scope.filter({ value: 'Investors' })).to.be(true);
      expect($scope.filter({ value: 'Articles detailed per source' })).to.be(true);
    });
  });
});
