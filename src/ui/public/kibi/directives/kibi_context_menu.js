import $ from 'jquery';
import { uiModules } from 'ui/modules';
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
      scope.dropmenu = $compile(template)(scope);
      const dropmenu = scope.dropmenu;
      const globalContextMenuContainerId = 'kibi-context-menu-container';
      const container = $('<div id="kibi-context-menu-' + getRandomInt(0, Number.MAX_SAFE_INTEGER) + '"/>');
      let globalContextMenuContainer = $('body').find('#' + globalContextMenuContainerId);
      if (globalContextMenuContainer.length === 0) {
        $('body').append('<div id="' + globalContextMenuContainerId + '" style="visibility: hidden"></div>');
        globalContextMenuContainer = $('body').find('#' + globalContextMenuContainerId);
      }
      globalContextMenuContainer.append(container);
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

      scope.$on('$destroy', function () {
        container.remove();
      });

      function hideMenu() {
        dropmenu.css({
          top: 0,
          left: 0
        });
        return dropmenu.removeClass('open');
      };

      function offset(elem, options) {
        const currentElem = elem[0];
        if (options) {
          const currentCssTop = currentElem.style.top || getComputedStyle(currentElem).top;
          const currentCssLeft = currentElem.style.left || getComputedStyle(currentElem).left;
          const currentOffset = offset(elem);
          const scrollLeft = window.pageXOffset || currentElem.scrollLeft;
          const scrollTop = window.pageYOffset || currentElem.scrollTop;
          const windowHeight = $window.innerHeight;
          let currentTop;
          let currentLeft;
          if ((currentCssTop + currentCssLeft).indexOf('auto') > -1) {
            currentTop = currentElem.offsetTop;
            currentLeft = currentElem.offsetLeft;
          } else {
            currentTop = parseFloat(currentCssTop) || 0;
            currentLeft = parseFloat(currentCssLeft) || 0;
          }
          const left = scrollLeft + options.left - currentOffset.left + currentLeft;
          let top = scrollTop + options.top - currentOffset.top + currentTop;

          if (top + currentElem.lastElementChild.offsetHeight > windowHeight) {
            top = top - currentElem.lastElementChild.offsetHeight;
          }

          elem.css({
            top: top + 'px',
            left: left + 'px'
          });
          return;
        }
        const rect = currentElem.getBoundingClientRect();
        return {
          top: rect.top + document.body.scrollTop,
          left: rect.left + document.body.scrollLeft
        };
      };
    }
  };
});
