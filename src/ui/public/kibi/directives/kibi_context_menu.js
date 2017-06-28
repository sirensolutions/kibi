import $ from 'jquery';
import uiModules from 'ui/modules';
import kibiContextMenuTemplate from 'ui/kibi/directives/kibi_context_menu_template.html';
import 'ui/kibi/directives/kibi_context_menu.less';

uiModules
.get('kibana')
.directive('kibiContextMenu', function ($compile, $document, $window) {
  const defaults = function (obj, prop, value) {
    if (!obj[prop] && !(typeof obj[prop] === 'boolean')) {
      return obj[prop] = value;
    }
  };

  return {
    restrict: 'A',
    scope: {
      menuList: '=kibiContextMenuList',
      clickMenu: '&kibiContextMenuClickMenu',
      rightClick: '&kibiContextMenuRightClick',
      onMenuClose: '&kibiContextMenuOnMenuClose',
      options: '=?kibiContextMenuOptions',
      align: '@kibiContextMenuAlign',
      template: '=?kibiContextMenuTemplate'
    },
    link: (scope, element, attrs) => {
      const template = scope.template || kibiContextMenuTemplate;

      scope.options = scope.options || {};
      defaults(scope.options, 'itemLabel', 'name');
      defaults(scope.options, 'isMultiple', false);

      scope.menu = scope.menuList;
      const getRandomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };
      scope.randomId = 'kibi-context-menu-' + getRandomInt(0, Number.MAX_SAFE_INTEGER);
      scope.dropmenu = $compile(template)(scope);
      const dropmenu = scope.dropmenu;
      const contextMenuContainerId = 'kibi-context-menu-container';
      let container = $('body').find('#' + contextMenuContainerId);
      if (container.length === 0) {
        $('body').append('<div id="' + contextMenuContainerId + '" style="visibility: hidden"></div>');
        container = $('body').find('#' + contextMenuContainerId);
      }
      container.append(dropmenu);

      element.bind('contextmenu', function (event) {
        event.preventDefault();
        setTimeout(function () {
          let left;
          let top;
          if (scope.rightClick) {
            scope.rightClick({
              $event: event
            });
          }

          dropmenu.addClass('open');

          const dropmenuHeight = dropmenu[0].offsetHeight;
          const dropmenuWidth = dropmenu[0].offsetWidth;

          scope.align = scope.align || 'lt';
          switch (scope.align) {
            case 'lt':
              top = event.clientY;
              left = event.clientX;
              break;
            case 'lb':
              top = event.clientY - dropmenuHeight;
              left = event.clientX;
              break;
            case 'rt':
              top = event.clientY;
              left = event.clientX - dropmenuWidth;
              break;
            case 'rb':
              top = event.clientY - dropmenuHeight;
              left = event.clientX - dropmenuWidth;
          }
          offset(dropmenu, {
            top: top,
            left: left
          });
        }, 0);
      });

      $document.bind('contextmenu', function (event) {
        if (!scope.options.isMultiple) {
          if (dropmenu.hasClass('open')) {
            return hideMenu();
          }
        }
      });

      $document.bind('click', function (event) {
        if (event.button === 0 && dropmenu.hasClass('open')) {
          hideMenu();
          if (scope.onMenuClose) {
            return scope.onMenuClose();
          }
        }
      });

      scope.clickItem = function (item, event) {
        if (scope.clickMenu) {
          return scope.clickMenu({
            item: item,
            $event: event
          });
        }
      };

      function hideMenu() {
        dropmenu.css({
          top: 0,
          left: 0
        });
        return dropmenu.removeClass('open');
      };

      function offset(elem, options) {
        const curElem = elem[0];
        if (options) {
          const curCssTop = curElem.style.top || getComputedStyle(curElem).top;
          const curCssLeft = curElem.style.left || getComputedStyle(curElem).left;
          const curOffset = offset(elem);
          const scrollLeft = window.pageXOffset || curElem.scrollLeft;
          const scrollTop = window.pageYOffset || curElem.scrollTop;
          const windowHeight = $window.innerHeight;
          let curTop;
          let curLeft;
          if ((curCssTop + curCssLeft).indexOf('auto') > -1) {
            curTop = curElem.offsetTop;
            curLeft = curElem.offsetLeft;
          } else {
            curTop = parseFloat(curCssTop) || 0;
            curLeft = parseFloat(curCssLeft) || 0;
          }
          const left = scrollLeft + options.left - curOffset.left + curLeft;
          let top = scrollTop + options.top - curOffset.top + curTop;

          if (top + curElem.lastElementChild.offsetHeight > windowHeight) {
            top = top - curElem.lastElementChild.offsetHeight;
          }

          elem.css({
            top: top + 'px',
            left: left + 'px'
          });
          return;
        }
        const rect = curElem.getBoundingClientRect();
        return {
          top: rect.top + document.body.scrollTop,
          left: rect.left + document.body.scrollLeft
        };
      };
    }
  };
});
