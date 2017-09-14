import jQuery from 'jquery';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon'; //TODO MERGE 5.5.2 check if sandbox is needed
import angular from 'angular';
import _ from 'lodash';
import '../kibi_menu_template';

describe('Kibi Components', function () {
  describe('Kibi Menu Template', function () {

    let $element;
    let $scope;
    let $document;
    let $menu;

    const init = function ({ template = '', items = [], context = {}, onShow, onHide, leftOffset } =  {}) {

      ngMock.module('kibana');

      ngMock.inject(function ($window, $compile, _$rootScope_, _$document_) {
        $scope = _$rootScope_;
        $document = _$document_;
        $scope.template = template;
        $scope.locals = { items, context };
        $scope.onShow = onShow;
        $scope.onHide = onHide;

        const html = `
          <span style="height: 10px;"
            kibi-menu-template="template"
            kibi-menu-template-locals="locals"
            kibi-menu-template-on-show-fn="onShow()"
            kibi-menu-template-on-hide-fn="onHide()"
            ${leftOffset ? ` kibi-menu-template-left-offset="${leftOffset}"` : ''}
          >Text</span>`;

        $element = angular.element(html);
        $compile($element)($scope);
        $scope.$digest();
        $menu = $document.find('body div.kibi-menu-template');
        jQuery($window).scrollTop(0); // there can be a scroll bar when running tests, this cancels it.
      });
    };

    describe('empty template', function () {

      it('check that container was appended to body, and destroyed', function () {
        init();

        expect($menu.size()).to.equal(1);
        expect($menu[0].children.length).to.equal(0);
        expect($menu.hasClass('visible')).to.equal(false);

        // destroy
        $scope.$destroy();
        $menu = $document.find('body div.kibi-menu-template');
        expect($menu.size()).to.equal(0);
      });

      describe('destroy afterEach', function () {

        afterEach(function () {
          $scope.$destroy();
        });

        it('visible class added removed correctly', function () {
          init();
          expect($menu.size()).to.equal(1);

          // click to show
          $element.click();
          expect($menu.hasClass('visible')).to.equal(true);

          // click to hide
          $element.click();
          expect($menu.hasClass('visible')).to.equal(false);
        });

        it('click outside element should hide menu', function () {
          init();
          expect($menu.size()).to.equal(1);

          // click to show
          $element.click();
          expect($menu.hasClass('visible')).to.equal(true);

          // click outside to hide
          angular.element(document.body).append('<span class="outside"/>');
          $document.find('span.outside').click();
          expect($menu.hasClass('visible')).to.equal(false);
          $document.find('span.outside').remove();
        });

        it('onHide and onShow should be triggered', function () {
          const onShowSpy = sinon.spy();
          const onHideSpy = sinon.spy();

          init({
            onShow: onShowSpy,
            onHide: onHideSpy
          });

          expect($menu.size()).to.equal(1);

          $element.click();
          $element.click();

          sinon.assert.calledOnce(onShowSpy);
          sinon.assert.calledOnce(onHideSpy);
        });

        it('position properties set correctly', function () {
          init();

          expect($menu.size()).to.equal(1);

          //make it visible
          $element.click();

          expect($menu.css('left')).to.equal('0px');
          expect($menu.css('top')).to.equal($element.css('height'));
        });

        it('position properties set correctly when kibiMenuTemplateLeftOffset set', function () {
          init({
            leftOffset: 123
          });

          expect($menu.size()).to.equal(1);

          //make it visible
          $element.click();

          expect($menu.css('left')).to.equal('123px');
          expect($menu.css('top')).to.equal($element.css('height'));
        });

      });
    });

    describe('simple template', function () {

      afterEach(function () {
        $scope.$destroy();
      });

      it('using context data variable was correctly replaced', function () {
        init({
          template: '<span>{{kibiMenuTemplateLocals.context.name}}</span>',
          context: { name: 'foo' }
        });

        expect($menu.size()).to.equal(1);
        expect($menu.hasClass('visible')).to.equal(false);
        expect($menu.find('span').size()).to.equal(1);
        expect($menu.find('span').text()).to.equal('foo');

        // now lets change the name
        $scope.$apply(function () {
          $scope.locals.context.name = 'boo';
        });
        expect($menu.find('span').text()).to.equal('boo');
      });

    });

    describe('template with ng-repeat', function () {

      afterEach(function () {
        $scope.$destroy();
      });

      it('using items data variables should be correctly replaced', function () {
        init({
          template: '<span ng-repeat="item in kibiMenuTemplateLocals.items">{{item.name}}</span>',
          items: [
            { name: 'A' },
            { name: 'B' }
          ]
        });

        expect($menu.size()).to.equal(1);
        expect($menu.hasClass('visible')).to.equal(false);
        expect($menu.find('span').size()).to.equal(2);
        expect($menu.find('span:nth-child(1)').text()).to.equal('A');
        expect($menu.find('span:nth-child(2)').text()).to.equal('B');

        // now lets change the name
        $scope.$apply(function () {
          $scope.locals.items.push({ name: 'C' });
        });
        expect($menu.find('span:nth-child(3)').text()).to.equal('C');
      });

      it('using items data on-click on items should work', function () {
        const clickOnA = sinon.spy();
        const clickOnB = sinon.spy();

        init({
          template: '<span ng-repeat="item in kibiMenuTemplateLocals.items" ng-click="item.click()">{{item.name}}</span>',
          items: [
            { name: 'A', click: clickOnA },
            { name: 'B', click: clickOnB }
          ]
        });

        expect($menu.size()).to.equal(1);
        expect($menu.hasClass('visible')).to.equal(false);
        expect($menu.find('span').size()).to.equal(2);

        // make it visible
        $element.click();
        expect($menu.hasClass('visible')).to.equal(true);

        $menu.find('span:nth-child(1)').click();
        $menu.find('span:nth-child(2)').click();

        sinon.assert.calledOnce(clickOnA);
        sinon.assert.calledOnce(clickOnB);
        sinon.assert.callOrder(clickOnA, clickOnB);
      });

    });

  });
});
