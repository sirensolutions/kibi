define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var angular = require('angular');
  var _ = require('lodash');

  require('directives/st_select');

  var $rootScope;
  var $elem;

  var init = function (initValue, items, required, modelDisabled, modelRequired, include, filter) {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function (Private, _$rootScope_, $compile, Promise) {
      $rootScope = _$rootScope_;
      $rootScope.model = initValue;

      var selectHelper = Private(require('directives/st_select_helper'));
      $rootScope.action = sinon.stub(selectHelper, 'getQueries').returns(Promise.resolve(items));

      var select = '<st-select ng-model="model" object-type="query"';
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
      }
      $elem = angular.element(select + '></st-select>');

      $compile($elem)($rootScope);
      $elem.scope().$digest();
    });
  };

  describe('Kibi Directives', function () {
    describe('st-select directive', function () {
      afterEach(function () {
        $elem.remove();
      });

      function firstElementIsEmpty(options) {
        expect(options[0]).to.be.ok();
        expect(options[0].value).to.be('');
        expect(options[0].text).to.be('');
      }

      it('should populate the select options with items returned from the object-type action', function () {
        var items = [ { value: 1, label: 'joe' } ];

        init(null, items);

        expect($rootScope.action.called).to.be.ok();

        var select = $elem.find('select');
        expect(select[0].required).to.be(false);
        expect(select[0].disabled).to.be(false);

        var options = $elem.find('option');
        expect(options).to.have.length(2); // the joe element plus the null one

        firstElementIsEmpty(options);

        expect(options[1]).to.be.ok();
        expect(options[1].value).to.be('1');
        expect(options[1].text).to.be('joe');
      });

      it('should populate the select options with required on', function () {
        var items = [ { value: 1, label: 'joe' } ];

        init(null, items, true);

        expect($rootScope.action.called).to.be.ok();

        var select = $elem.find('select');
        expect(select[0].required).to.be(true);

        var options = $elem.find('option');
        expect(options).to.have.length(2);

        firstElementIsEmpty(options);

        expect(options[1]).to.be.ok();
        expect(options[1].value).to.be('1');
        expect(options[1].text).to.be('joe');
      });

      it('should require an option to be selected 1', function () {
        var items = [ { value: 1, label: 'joe' } ];

        init(null, items, null, null, true);

        expect($rootScope.action.called).to.be.ok();
        var select = $elem.find('select');
        expect(select[0].required).to.be(true);
      });

      it('should require an option to be selected 2', function () {
        var items = [ { value: 1, label: 'joe' } ];

        init(null, items, true);

        expect($rootScope.action.called).to.be.ok();
        var select = $elem.find('select');
        expect(select[0].required).to.be(true);
      });

      it('should disable the select menu', function () {
        var items = [ { value: 1, label: 'joe' } ];

        init(null, items, null, true);

        expect($rootScope.action.called).to.be.ok();
        var select = $elem.find('select');
        expect(select[0].disabled).to.be(true);
      });

      it('should add the include to the select options', function () {
        var items = [ { value: 1, label: 'joe' } ];
        var include = [ { value: 2, label: 'toto' } ];

        init(null, items, null, null, null, include);

        expect($rootScope.action.called).to.be.ok();
        var options = $elem.find('option');
        expect(options).to.have.length(3);

        firstElementIsEmpty(options);

        expect(options[1]).to.be.ok();
        expect(options[1].value).to.be('2');
        expect(options[1].text).to.be('toto');

        expect(options[2]).to.be.ok();
        expect(options[2].value).to.be('1');
        expect(options[2].text).to.be('joe');
      });

      it('should add the include to the select options and take care of duplicates', function () {
        var items = [ { value: 1, label: 'joe' }, { value: 3, label: 'tata' } ];
        var include = [ { value: 1, label: 'joe' }, { value: 2, label: 'toto' } ];

        init(null, items, null, null, null, include);

        expect($rootScope.action.called).to.be.ok();
        var options = $elem.find('option');
        expect(options).to.have.length(4);

        firstElementIsEmpty(options);

        expect(options[1]).to.be.ok();
        expect(options[1].value).to.be('1');
        expect(options[1].text).to.be('joe');

        expect(options[2]).to.be.ok();
        expect(options[2].value).to.be('2');
        expect(options[2].text).to.be('toto');

        expect(options[3]).to.be.ok();
        expect(options[3].value).to.be('3');
        expect(options[3].text).to.be('tata');
      });

      it('should exclude items from the select', function () {
        var items = [ { value: 1, label: 'joe' }, { value: 2, label: 'toto' } ];
        var filter = function (id, value) {
          return value === 1;
        };

        init(null, items, null, null, null, null, filter);

        expect($rootScope.action.called).to.be.ok();
        var options = $elem.find('option');
        expect(options).to.have.length(2);

        firstElementIsEmpty(options);

        expect(options[1]).to.be.ok();
        expect(options[1].value).to.be('2');
        expect(options[1].text).to.be('toto');
      });

      it('should exclude some items and include others from the select options', function () {
        var items = [ { value: 1, label: 'joe' }, { value: 2, label: 'toto' } ];
        var filter = function (id, value) {
          return value === 1;
        };
        var include = [ { value: 3, label: 'tata' } ];

        init(null, items, null, null, null, include, filter);

        expect($rootScope.action.called).to.be.ok();
        var options = $elem.find('option');
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
        var items = [ { value: 2, label: 'toto' } ];
        var filter = function (id, value) {
          return value === 1;
        };
        var include = [ { value: 1, label: 'joe' } ];

        init(null, items, null, null, null, include, filter);

        expect($rootScope.action.called).to.be.ok();
        var options = $elem.find('option');
        expect(options).to.have.length(2);

        firstElementIsEmpty(options);

        expect(options[1]).to.be.ok();
        expect(options[1].value).to.be('2');
        expect(options[1].text).to.be('toto');
      });

      it('should add an empty element only if there are items', function () {
        var items = [];

        init(null, items);

        expect($rootScope.action.called).to.be.ok();
        var options = $elem.find('option');
        expect(options).to.have.length(0);
      });

      it('should automatically select the element if it is the only one and the select is required', function () {
        var items = [ { value: 2, label: 'toto' } ];

        init(null, items, true);

        var options = $elem.find('option');
        expect(options).to.have.length(2);

        expect(options[0].defaultSelected).to.be(false);
        expect(options[0].value).to.be('');
        expect(options[1].defaultSelected).to.be(true);
        expect(options[1].value).to.be('2');
      });

      it('should NOT automatically select the element if it is the only one and the select is optional', function () {
        var items = [ { value: 2, label: 'toto' } ];

        init(null, items);

        var options = $elem.find('option');
        expect(options).to.have.length(2);

        expect(options[0].defaultSelected).to.be(false);
        expect(options[0].value).to.be('');
        expect(options[1].defaultSelected).to.be(false);
        expect(options[1].value).to.be('2');
      });

      it('should set analyzedField to true if the selected item is analyzed', function () {
        var items = [ { value: 2, label: 'toto', options: { analyzed: true } } ];

        init(2, items);
        expect($elem.isolateScope().analyzedField).to.be(true);
      });

      it('should select the option that is already in the ngModel controller', function () {
        var items = [ { value: 2, label: 'toto', options: { analyzed: true } } ];

        init(2, items);

        var ngModel = $elem.controller('ngModel');
        expect(ngModel.$valid).to.be(true);

        var options = $elem.find('option');
        expect(options).to.have.length(2);
        expect(options[1].selected).to.be(true);
        expect(options[1].value).to.be('2');
        expect(options[1].text).to.be('toto');
      });

      it('should set model as invalid if empty and select is required', function () {
        var items = [ { value: 2, label: 'toto', options: { analyzed: true } } ];

        init('', items, true);

        var ngModel = $elem.controller('ngModel');
        expect(ngModel.$valid).to.be(false);
      });
    });
  });
});
