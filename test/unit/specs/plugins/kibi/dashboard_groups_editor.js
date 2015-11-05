define(function (require) {
  describe('Kibi Controllers', function () {
    var $scope, $el;
    var sinon = require('test_utils/auto_release_sinon');
    var $ = require('jquery');

    function init(dashboardGroup) {
      module('apps/settings');
      module('app/dashboard', function ($provide) {
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
      inject(function (Promise, _$rootScope_, $controller) {
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
        var dashboardGroup = {
          dashboards: [
            {
              id: 'Dogs'
            },
            {
              id: 'Cats'
            }
          ]
        };

        init(dashboardGroup);
        $scope.$digest();

        expect($scope.dashboardGroup).to.be.ok();
        expect($scope.dashboardGroup.dashboards).to.have.length(2);
        expect($scope.dashboardGroup.dashboards[0].title).to.be('Boiled');
        expect($scope.dashboardGroup.dashboards[1].title).to.be('Water');
      });

      it('should only retrieve the title of the dashboard if it is missing', function () {
        var dashboardGroup = {
          dashboards: [
            {
              id: 'Dogs',
              title: 'my bad one'
            },
            {
              id: 'Cats'
            }
          ]
        };

        init(dashboardGroup);
        $scope.$digest();

        expect($scope.dashboardGroup).to.be.ok();
        expect($scope.dashboardGroup.dashboards).to.have.length(2);
        expect($scope.dashboardGroup.dashboards[0].title).to.be('my bad one');
        expect($scope.dashboardGroup.dashboards[1].title).to.be('Water');
      });

      it('should save the dashboardGroup on submit', function (done) {
        var dashboardGroup = {
          dashboards: [
            {
              id: 'Dogs'
            }
          ]
        };

        init(dashboardGroup);
        $scope.submit();
        $scope.$on('kibi:dashboardgroup:changed', function (event, groupId) {
          expect(groupId).to.be('123');
          done();
        });

        $scope.$digest();

        expect(dashboardGroup.save.called).to.be.ok();
      });
    });
  });
});
