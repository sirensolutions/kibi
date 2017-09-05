import sinon from 'auto-release-sinon';
import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import '../kibi_select';
import MockState from 'fixtures/mock_state';

let $rootScope;
let $scope;
let $elem;
let dashboardGroups;

const fakeGroups = [
  {
    id: 'groupA',
    title: 'groupA',
    dashboards: [
      {
        id: 'dashboardA1',
        title: 'dashboardA1'
      },
      {
        id: 'dashboardA2',
        title: 'dashboardA2'
      }
    ]
  },
  {
    id: 'groupB',
    title: 'groupB',
    dashboards: [
      {
        id: 'dashboardB1',
        title: 'dashboardB1',
        disabled: true
      },
      {
        id: 'dashboardB2',
        title: 'dashboardB2'
      },
      {
        id: 'dashboardB3',
        title: 'dashboardB3'
      }
    ]
  },
  {
    id: 'groupC',
    title: 'groupC',
    dashboards: [
      {
        id: 'dashboardC1',
        title: 'dashboardC1'
      }
    ]
  }
];

const dashboardArray = [
  {
    id: 'groupA',
    title: 'groupA',
    dashboards: [
      {
        id: 'dashboardA1',
        title: 'itsVeryLongDashboardName'
      }
    ]
  }
];

const init = function ({
  multiSelect = null,
  dashboardArray = null,
  qtipTooltip = null,
  qtipOptions = null,
  titleLimit = null,
  disableMessage = null
}) {
  // Load the application
  ngMock.module('kibana', $provide => {
    $provide.service('kibiState', function () {
      return new MockState({ filters: [] });
    });
    $provide.constant('kibiDatasourcesSchema', {});
  });

  // Create the scope
  ngMock.inject(function (Private, _$rootScope_, $compile, Promise, _dashboardGroups_) {
    $rootScope = _$rootScope_.$new();

    let select = '<kibi-select-dashboard ng-model="model"';
    if (multiSelect !== null && multiSelect !== undefined) {
      select += ' multi-select="' + multiSelect + '"';
    }
    if (dashboardArray !== null && dashboardArray !== undefined) {
      $rootScope.dashboardArray = dashboardArray;
      select += ' dashboard-array="dashboardArray"';
    }
    if (qtipTooltip !== null && qtipTooltip !== undefined) {
      select += ' qtip-tooltip="' + qtipTooltip + '"';
    }
    if (qtipOptions !== null && qtipOptions !== undefined) {
      $rootScope.qtipOptions = qtipOptions;
      select += ' qtip-options="qtipOptions"';
    }
    if (titleLimit !== null && titleLimit !== undefined) {
      select += 'title-limit="' + titleLimit + '"';
    }
    if (disableMessage !== null && disableMessage !== undefined) {
      select += 'disable-message="' + disableMessage + '"';
    }

    dashboardGroups = _dashboardGroups_;
    sinon.stub(dashboardGroups, 'getGroups').returns(fakeGroups);

    $elem = $compile(select + '></kibi-select-dashboard>')($rootScope);
    $scope = $elem.isolateScope();
    $elem.scope().$digest();
  });
};

describe('Kibi Directives', function () {
  describe('kibi-select-dashboard directive', function () {

    afterEach(function () {
      $elem.remove();
    });

    it('should populate dashboard groups if dashboardGroup is not set', function () {

      init({});
      expect($scope.dashboardGroups.length).to.be.equal(3);
      expect($scope.dashboardGroups[0].dashboards.length).to.be.equal(2);
      expect($scope.dashboardGroups[1].dashboards.length).to.be.equal(3);
      expect($scope.dashboardGroups[2].dashboards.length).to.be.equal(1);

      for (let i = 0; i < $scope.dashboardGroups.length; i++) {
        expect($scope.dashboardGroups[i].title).to.be.equal(fakeGroups[i].title);
        for (let j = 0; j < $scope.dashboardGroups[i].dashboards.length; j++) {
          expect($scope.dashboardGroups[i].dashboards[j].title).to.be.equal(fakeGroups[i].dashboards[j].title);
        }
      }
    });


    it('should not populate dashboard groups if dashboardGroup is set', function () {

      init({ dashboardArray });
      expect($scope.dashboardGroups.length).to.be.equal(1);
      expect($scope.dashboardGroups[0].dashboards.length).to.be.equal(1);

      for (let i = 0; i < $scope.dashboardGroups.length; i++) {
        expect($scope.dashboardGroups[i].title).to.be.equal(dashboardArray[i].title);
        for (let j = 0; j < $scope.dashboardGroups[i].dashboards.length; j++) {
          expect($scope.dashboardGroups[i].dashboards[j].title).to.be.equal(dashboardArray[i].dashboards[j].title);
        }
      }
    });


    describe('single select', function () {
      it('should show single select component if multiSelect is not set', function () {

        init({});
        expect($elem.find('optgroup').length).to.be.equal(3);
        expect($elem.find('option').length).to.be.equal(7);
        expect($elem.find('section').hasClass('ng-hide')).to.be.equal(true);
      });
    });

    describe('multi select', function () {
      it('should show multi select component if multiSelect is set', function () {

        init({ multiSelect : true });
        expect($elem.find('input[type=\'checkbox\']').length).to.be.equal(6);
        expect($elem.find('select').hasClass('ng-hide')).to.be.equal(true);
      });

      it('should detect disabled dashboard', function () {

        init({});
        const element = $elem.find('section input[type=\'checkbox\']')[2];
        expect(element.hasAttribute('disabled')).to.be.equal(true);
      });

      it('should limit dashboard title if titleLimit is set', function () {

        init({ dashboardArray, titleLimit: 10 });
        const element = $elem.find('span')[0].innerText.toString().trim();
        expect(element.includes('itsVeryLon...')).to.be.equal(true);
      });

    });

  });
});
