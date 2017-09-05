import sinon from 'auto-release-sinon';
import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import '../kibi_select';
import { KibiSelectHelperFactory } from 'ui/kibi/directives/kibi_select_helper';
import MockState from 'fixtures/mock_state';

let $rootScope;
let $scope;
let $elem;

const init = function ({
  initValue = null,
  items,
  required = false,
  modelDisabled = null,
  modelRequired = null,
  include = null,
  filter = null,
  options = null
}) {
  // Load the application
  ngMock.module('kibana', $provide => {
    $provide.service('kibiState', function () {
      return new MockState({ filters: [] });
    });
    $provide.constant('kibiDatasourcesSchema', {});
  });

  // Create the scope
  ngMock.inject(function (Private, _$rootScope_, $compile, Promise) {
    $rootScope = _$rootScope_.$new();
    $rootScope.model = initValue;

    const selectHelper = Private(KibiSelectHelperFactory);
    $rootScope.action = sinon.stub(selectHelper, 'getSavedSearches').returns(Promise.resolve(items));

    let select = '<kibi-select ng-model="model" object-type="search"';
    if (required) {
      select += ' required';
    }
    if (modelDisabled !== null && modelDisabled !== undefined) {
      select += ' model-disabled="' + modelDisabled + '"';
    }
    if (modelRequired !== null && modelRequired !== undefined) {
      select += ' model-required="' + modelRequired + '"';
    }
    if (include !== null && include !== undefined) {
      $rootScope.include = include;
      select += ' include="include"';
    }
    if (filter !== null && filter !== undefined) {
      $rootScope.filter = filter;
      select += ' filter="filter"';

      if (options !== null && options !== undefined) {
        $rootScope.options = options;
        select += ' options="' + options + '"';
      }
    }

    $elem = $compile(select + '></kibi-select>')($rootScope);
    $scope = $elem.isolateScope();
    $elem.scope().$digest();
  });
};

describe('Kibi Directives', function () {
  describe('kibi-select directive', function () {
    afterEach(function () {
      $elem.remove();
    });

    function firstElementIsEmpty(options) {
      expect(options[0]).to.be.ok();
      expect(options[0].value).to.be('');
      expect(options[0].text).to.be('');
    }

    it('should populate the select options with items returned from the object-type action', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        }
      ];

      init({ items });

      expect($rootScope.action.called).to.be.ok();

      const select = $elem.find('select');
      expect($scope.required).to.be(false);
      expect(select[0].disabled).to.be(false);

      const options = $elem.find('option');
      expect(options).to.have.length(2); // the joe element plus the null one

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('1');
      expect(options[1].text).to.be('joe');
    });

    it('should populate the select options with required on', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        }
      ];

      init({ initValue: 1, items, required: true });

      expect($rootScope.action.called).to.be.ok();

      expect($scope.required).to.be(true);

      const options = $elem.find('option');
      expect(options).to.have.length(2);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('1');
      expect(options[1].text).to.be('joe');
    });

    it('should require an option to be selected 1', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        }
      ];

      init({ items, modelRequired: true });

      expect($rootScope.action.called).to.be.ok();
      expect($scope.required).to.be(true);
    });

    it('should require an option to be selected 2', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        }
      ];

      init({ items, required: true });

      expect($rootScope.action.called).to.be.ok();
      expect($scope.required).to.be(true);
    });

    it('should disable the select menu', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        }
      ];

      init({ items, modelDisabled: true });

      // do not try to render anything
      expect($rootScope.action.called).to.not.be.ok();
      const select = $elem.find('select');
      expect(select[0].disabled).to.be(true);
    });

    describe('should keep the initial required parameter when enabling a disabled kibi-select', function () {
      it('should be required', function () {
        const items = [
          {
            value: 1,
            id: 1,
            label: 'joe'
          }
        ];

        init({ items, required: true, modelDisabled: true });

        // do not try to render anything
        expect($rootScope.action.called).to.not.be.ok();
        const select = $elem.find('select');
        expect(select[0].disabled).to.be(true);

        $scope.modelDisabled = false;
        $scope.$digest();
        expect($rootScope.action.called).to.be.ok();
        expect($scope.required).to.be(true);
      });

      it('should not be required', function () {
        const items = [
          {
            value: 1,
            id: 1,
            label: 'joe'
          }
        ];

        init({ items, modelDisabled: true });

        // do not try to render anything
        expect($rootScope.action.called).to.not.be.ok();
        const select = $elem.find('select');
        expect(select[0].disabled).to.be(true);

        $scope.modelDisabled = false;
        $scope.$digest();
        expect($rootScope.action.called).to.be.ok();
        expect($scope.required).to.be(false);
      });
    });

    it('should add the include to the select options XXX', function () {
      const items = [
        {
          value: 2,
          id: 2,
          label: 'joe'
        }
      ];
      const include = [
        {
          value: 1,
          id: 1,
          label: 'toto'
        }
      ];

      init({ items, include });

      expect($rootScope.action.called).to.be.ok();
      const options = $elem.find('option');
      expect(options).to.have.length(3);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('joe');

      expect(options[2]).to.be.ok();
      expect(options[2].value).to.be('1');
      expect(options[2].text).to.be('toto');
    });

    it('should remove duplicates when adding the include to the select options', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        },
        {
          value: 3,
          id: 3,
          label: 'tata'
        }
      ];
      const include = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        },
        {
          value: 2,
          id: 2,
          label: 'toto'
        }
      ];

      init({ items, include });

      expect($rootScope.action.called).to.be.ok();
      const options = $elem.find('option');
      expect(options).to.have.length(4);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('1');
      expect(options[1].text).to.be('joe');

      expect(options[2]).to.be.ok();
      expect(options[2].value).to.be('3');
      expect(options[2].text).to.be('tata');

      expect(options[3]).to.be.ok();
      expect(options[3].value).to.be('2');
      expect(options[3].text).to.be('toto');
    });

    it('should exclude items from the select based on item value', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        },
        {
          value: 2,
          id: 2,
          label: 'toto'
        }
      ];
      const filter = function (item, options, selected) {
        if (item) {
          return item.value === 1;
        } else {
          return false;
        }
      };

      init({ items, filter });

      expect($rootScope.action.called).to.be.ok();
      const options = $elem.find('option');
      expect(options).to.have.length(2);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('toto');
    });

    it('should exclude items from the select based on the filter options', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        },
        {
          value: 2,
          id: 2,
          label: 'toto'
        }
      ];
      const filter = function (item, options) {
        if (item) {
          return item.label === options.name;
        } else {
          return false;
        }
      };

      init({ items, filter, options: '{name: \'joe\'}' });

      expect($rootScope.action.called).to.be.ok();
      const options = $elem.find('option');
      expect(options).to.have.length(2);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('toto');
    });

    it('should exclude some items and include others from the select options', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        },
        {
          value: 2,
          id: 2,
          label: 'toto'
        }
      ];
      const filter = function (item, options, selected) {
        if (item) {
          return item.value === 1;
        } else {
          return false;
        }
      };
      const include = [
        {
          id: 3,
          value: 3,
          label: 'tata'
        }
      ];

      init({ items, include, filter });

      expect($rootScope.action.called).to.be.ok();
      const options = $elem.find('option');
      expect(options).to.have.length(3);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('3');
      expect(options[1].text).to.be('tata');

      expect(options[2]).to.be.ok();
      expect(options[2].value).to.be('2');
      expect(options[2].text).to.be('toto');
    });

    it('should exclude items that were explicitly included', function () {
      const items = [
        {
          value: 2,
          id: 2,
          label: 'toto'
        }
      ];
      const filter = function (item, options, selected) {
        if (item) {
          return item.value === 1;
        } else {
          return false;
        }
      };
      const include = [
        {
          value: 1,
          id: 1,
          label: 'joe'
        }
      ];

      init({ items, include, filter });

      expect($rootScope.action.called).to.be.ok();
      const options = $elem.find('option');
      expect(options).to.have.length(2);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('toto');
    });

    it('should automatically select the element if it is the only one and the select is required', function () {
      const items = [
        {
          value: 2,
          id: 2,
          label: 'toto'
        }
      ];

      init({ initValue: 2, items, required: true });

      const options = $elem.find('option');
      expect(options).to.have.length(2);

      firstElementIsEmpty(options);

      expect(options[1].defaultSelected).to.be(true);
      expect(options[1].value).to.be('2');
    });

    it('should NOT automatically select the element if it is the only one and the select is optional', function () {
      const items = [
        {
          value: 2,
          id: 2,
          label: 'toto'
        }
      ];

      init({ items });

      const options = $elem.find('option');
      expect(options).to.have.length(2);
      expect(options[0].defaultSelected).to.be(true);
      expect(options[0].value).to.be('');
      expect(options[1].defaultSelected).to.be(false);
      expect(options[1].value).to.be('2');
    });

    it('should set analyzedField to true if the selected item is analyzed', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'tata'
        },
        {
          value: 2,
          id: 2,
          label: 'toto',
          options: {
            analyzed: true
          }
        }
      ];

      init({ initValue: 2, items });
      expect($scope.analyzedField).to.be(true);
    });

    it('should set analyzedField to true if the auto-selected item is analyzed', function () {
      const items = [
        {
          value: 2,
          id: 2,
          label: 'toto',
          options: {
            analyzed: true
          }
        }
      ];

      init({ items, required: true });
      expect($scope.analyzedField).to.be(true);
    });

    it('should select the option that is already in the ngModel controller', function () {
      const items = [
        {
          value: 2,
          id: 2,
          label: 'toto',
          options: {
            analyzed: true
          }
        }
      ];

      init({ initValue: 2, items });

      expect($scope.isInvalid()).to.be(false);

      const options = $elem.find('option');
      expect(options).to.have.length(2);
      expect(options[1].selected).to.be(true);
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('toto');
    });

    it('should set model as invalid if empty and select is required', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'tata'
        },
        {
          value: 2,
          id: 2,
          label: 'toto'
        }
      ];

      init({ items, required: true });

      expect($scope.isInvalid()).to.be(true);
    });

    it('should sort the items by label', function () {
      const items = [
        {
          value: 1,
          id: 1,
          label: 'bbb'
        },
        {
          value: 2,
          id: 2,
          label: 'aaa'
        }
      ];

      init({ items });

      expect($rootScope.action.called).to.be.ok();

      const options = $elem.find('option');
      expect(options).to.have.length(3); // the joe element plus the null one

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('aaa');
      expect(options[2]).to.be.ok();
      expect(options[2].value).to.be('1');
      expect(options[2].text).to.be('bbb');
    });

    it('should sort the included items too', function () {
      const items = [
        {
          value: 2,
          id: 2,
          label: 'aaa'
        }
      ];
      const include = [
        {
          value: 1,
          id: 1,
          label: 'bbb'
        }
      ];

      init({ items, include });

      expect($rootScope.action.called).to.be.ok();
      const options = $elem.find('option');
      expect(options).to.have.length(3);

      firstElementIsEmpty(options);

      expect(options[1]).to.be.ok();
      expect(options[1].value).to.be('2');
      expect(options[1].text).to.be('aaa');

      expect(options[2]).to.be.ok();
      expect(options[2].value).to.be('1');
      expect(options[2].text).to.be('bbb');
    });
  });
});
