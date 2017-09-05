import Notifier from 'ui/notify/notifier';
import sinon from 'sinon'; //TODO MERGE 5.5.2 check if sandbox is needed
import angular from 'angular';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import '../kibi_array_param';

let $rootScope;
const $elems = {};

const init = function (required, defaultElement, index, disable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function (_$rootScope_, $compile) {
    $rootScope = _$rootScope_;
    $rootScope.array = [];

    // Create the elements
    let addAttributes = 'model="array" label="element" post-action="action()"';
    if (disable) {
      addAttributes += ' disable="true"';
    }
    if (required) {
      addAttributes += ' required';
    }
    if (defaultElement) {
      $rootScope.de = defaultElement;
      addAttributes += ' default="{{ de }}"';
    }
    $elems.add = angular.element('<kibi-array-param-add ' + addAttributes + '></kibi-array-param-add>');

    const rm = '<kibi-array-param-remove model="array" post-action="action()" index="' + index + '"></kibi-array-param-remove>';
    $elems.remove = angular.element(rm);

    const up = '<kibi-array-param-up model="array" post-action="action()" index="' + index + '"></kibi-array-param-up>';
    $elems.up = angular.element(up);

    const down = '<kibi-array-param-down model="array" post-action="action()" index="' + index + '"></kibi-array-param-down>';
    $elems.down = angular.element(down);

    'add remove up down'.split(' ').forEach(function (type) {
      // And compile them
      $compile($elems[type])($rootScope);
      // Fire a digest cycle
      $elems[type].scope().$digest();
    });
    // Add a function to check the run status of.
    $rootScope.action = sinon.spy();
  });
};

describe('Kibi Directives', function () {
  describe('kibi_array_param directive', function () {

    // https://github.com/elastic/kibana/pull/8822 ensure that the notifier is emptied by each test
    afterEach(() => {
      Notifier.prototype._notifs.length = 0;
    });

    afterEach(function () {
      'add remove up down'.split(' ').forEach(function (type) {
        $elems[type].remove();
      });
    });

    it('should set the button label to "Add element"', function () {
      init(false);
      const label = $elems.add.find('span').text();

      expect(label).to.be('Add element');
    });

    describe('add element', function () {
      it('should add an empty object if no default is given', function () {
        init(false);

        $elems.add.click();
        expect($rootScope.array).to.have.length(1);
        expect($rootScope.array[0]).to.eql({});
        expect($rootScope.action.called).to.be(true);
      });

      it('should add the default element if passed', function () {
        init(false, 'aaa');

        $elems.add.click();
        expect($rootScope.array).to.have.length(1);
        expect($rootScope.array[0]).to.eql('aaa');
        expect($rootScope.action.called).to.be(true);
      });

      it('default element is an object', function () {
        init(false, { a: 'b' });

        $elems.add.click();
        expect($rootScope.array).to.have.length(1);
        expect($rootScope.array[0]).to.eql({ a: 'b' });
        expect($rootScope.action.called).to.be(true);
      });

      it('should add an element if the array is empty and kibi-array-param-add is required', function () {
        init(true);

        expect($rootScope.array).to.have.length(1);
      });

      it('should disable kibi-array-param-add', function () {
        init(null, null, null, true);

        expect($elems.add).to.have.length(1);
        expect($elems.add[0].disabled).to.be(true);
      });
    });

    describe('remove element', function () {
      it('should remove the element', function () {
        init();

        $elems.add.click();
        expect($rootScope.array).to.have.length(1);
        $elems.remove.click();
        expect($rootScope.array).to.have.length(0);
      });

      it('should not remove last element if array is required', function () {
        init(true);

        expect($rootScope.array).to.have.length(1);
        $elems.remove.click();
        expect($rootScope.array).to.have.length(1);
      });
    });

    describe('move element up and down', function () {
      it('should move the element up', function () {
        init(null, null, 1);

        $elems.add.click();
        $elems.add.click();
        $elems.add.click();
        expect($rootScope.array).to.have.length(3);

        $rootScope.array[0] = { a: 1 };
        $rootScope.array[1] = { a: 2 };
        $rootScope.array[2] = { a: 3 };

        $elems.up.click();
        expect($rootScope.array[0]).to.eql({ a: 2 });
        expect($rootScope.array[1]).to.eql({ a: 1 });
        expect($rootScope.array[2]).to.eql({ a: 3 });
      });

      it('should move the element down', function () {
        init(null, null, 1);

        $elems.add.click();
        $elems.add.click();
        $elems.add.click();
        expect($rootScope.array).to.have.length(3);

        $rootScope.array[0] = { a: 1 };
        $rootScope.array[1] = { a: 2 };
        $rootScope.array[2] = { a: 3 };

        $elems.down.click();
        expect($rootScope.array[0]).to.eql({ a: 1 });
        expect($rootScope.array[1]).to.eql({ a: 3 });
        expect($rootScope.array[2]).to.eql({ a: 2 });
      });
    });
  });
});
