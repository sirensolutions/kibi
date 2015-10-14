define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');
  var angular = require('angular');

  require('directives/array_param');

  var $rootScope;
  var $elems = {};

  var init = function (required, defaultElement, index, disable) {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function (_$rootScope_, $compile) {
      $rootScope = _$rootScope_;
      // Create the elements
      var addAttributes = 'ng-model="array" label="element" post-action="action()"';
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
      $elems.add = angular.element('<array-param-add ' + addAttributes + '></array-param-add>');

      var rm = '<array-param-remove ng-model="array" post-action="action()" index="' + index + '"></array-param-remove>';
      $elems.remove = angular.element(rm);

      var up = '<array-param-up ng-model="array" post-action="action()" index="' + index + '"></array-param-up>';
      $elems.up = angular.element(up);

      var down = '<array-param-down ng-model="array" post-action="action()" index="' + index + '"></array-param-down>';
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
    return $elems.add.find('button').controller('ngModel');
  };

  describe('Kibi Components', function () {
    describe('array_param directive', function () {
      afterEach(function () {
        'add remove up down'.split(' ').forEach(function (type) {
          $elems[type].remove();
        });
      });

      it('should set the button label to "Add element"', function () {
        var ngModel = init(false);
        var label = $elems.add.find('span').text();

        expect(ngModel.$valid).to.be(true);
        expect(label).to.be('Add element');
      });

      describe('add element', function () {
        it('should add an empty object if no default is given', function () {
          var ngModel = init(false);

          expect(ngModel.$valid).to.be(true);
          $elems.add.find('button').click();
          expect($rootScope.array).to.have.length(1);
          expect($rootScope.array[0]).to.eql({});
          expect($rootScope.action.called).to.be(true);
        });

        it('should add the default element if passed', function () {
          var ngModel = init(false, 'aaa');

          expect(ngModel.$valid).to.be(true);
          $elems.add.find('button').click();
          expect($rootScope.array).to.have.length(1);
          expect($rootScope.array[0]).to.eql('aaa');
          expect($rootScope.action.called).to.be(true);
        });

        it('default element is an object', function () {
          var ngModel = init(false, { a: 'b' });

          expect(ngModel.$valid).to.be(true);
          $elems.add.find('button').click();
          expect($rootScope.array).to.have.length(1);
          expect($rootScope.array[0]).to.eql({ a: 'b' });
          expect($rootScope.action.called).to.be(true);
        });

        it('should invalidate the model if array-param-add is required', function () {
          var ngModel = init(true);

          expect(ngModel.$valid).to.be(false);
          $elems.add.find('button').click();
          expect(ngModel.$valid).to.be(true);
        });

        it('should disable array-param-add', function () {
          init(null, null, null, true);

          expect($elems.add.find('button')[0].disabled).to.be(true);
        });
      });

      describe('remove element', function () {
        it('should remove the element', function () {
          init();

          $elems.add.find('button').click();
          expect($rootScope.array).to.have.length(1);
          $elems.remove.click();
          expect($rootScope.array).to.have.length(0);
        });

        it('should invalidate the model when removing last element if required', function () {
          var ngModel = init(true);

          $elems.add.find('button').click();
          $elems.remove.click();
          expect(ngModel.$valid).to.be(false);
        });
      });

      describe('move element up and down', function () {
        it('should move the element up', function () {
          init(null, null, 1);

          $elems.add.find('button').click();
          $elems.add.find('button').click();
          $elems.add.find('button').click();
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

          $elems.add.find('button').click();
          $elems.add.find('button').click();
          $elems.add.find('button').click();
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

});
